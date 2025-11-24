// pages/collection/collection.js
const app = getApp()
const { getRarityText, getRarityClass } = require('../../utils/rarityMap.js')

Page({
  data: {
    isLoggedIn: false,
    loading: false,
    showFilterPanel: false, // 筛选面板显示状态
    currentTypeFilter: 'all', // 装备类型筛选（单选）
    advancedFilters: { // 高级筛选（多选）
      unique: true, // 暗金
      suit: true,   // 套装
      runeWord: true, // 符文之语
      activated: true,  // 已激活
      notActivated: true // 未激活
    },
    searchKeyword: '',
    equipmentList: [],
    filteredList: [],
    displayList: [], // 真正用于页面渲染的列表（只存部分数据）
    pageSize: 20,    // 每次渲染多少条
    pageIndex: 1,    // 当前页码
    sortBy: 'name', // name, type, rarity, activation
    sortOrder: 'asc' // asc, desc
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      // 检查是否需要强制刷新（从上个页面返回时）
      const shouldRefresh = wx.getStorageSync('shouldRefreshCollection')
      if (shouldRefresh) {
        wx.removeStorageSync('shouldRefreshCollection')
        this.loadCollectionData(true) // 强制刷新
      } else {
        this.loadCollectionData()
      }
    }
  },

  onPullDownRefresh() {
    if (this.data.isLoggedIn) {
      this.loadCollectionData().then(() => {
        wx.stopPullDownRefresh()
      })
    } else {
      wx.stopPullDownRefresh()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({ isLoggedIn })
  },

  // 设置类型筛选条件（第二行，单选）
  setTypeFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ currentTypeFilter: type })
    this.filterEquipmentList()
  },

  // 切换筛选面板显示状态（优化setData）
  toggleFilterPanel() {
    const newState = !this.data.showFilterPanel
    if (newState !== this.data.showFilterPanel) {
      this.setData({
        showFilterPanel: newState
      })
    }
  },

  // 切换高级筛选条件（多选）
  toggleAdvancedFilter(e) {
    const filter = e.currentTarget.dataset.filter
    const { advancedFilters } = this.data
    
    // 切换选中状态
    advancedFilters[filter] = !advancedFilters[filter]
    
    // 检查是否所有筛选都被取消，如果是则默认选中所有
    const allUnselected = Object.values(advancedFilters).every(value => !value)
    if (allUnselected) {
      // 重置为默认选中所有
      Object.keys(advancedFilters).forEach(key => {
        advancedFilters[key] = true
      })
    }
    
    this.setData({ advancedFilters })
    this.filterEquipmentList()
  },

  // 加载图鉴数据（优化版）
  async loadCollectionData(forceRefresh = false) {
    try {
      this.setData({ loading: true })
      
      // 检查缓存
      const cacheKey = `collectionData_${app.globalData.openid}`
      const cachedData = wx.getStorageSync(cacheKey)
      const now = Date.now()
      
      // 如果强制刷新或缓存过期，跳过缓存
      if (!forceRefresh && cachedData && (now - cachedData.timestamp < 3 * 60 * 1000)) {
        this.setData({
          equipmentList: cachedData.equipmentList,
          activatedCount: cachedData.activatedCount,
          totalCount: cachedData.totalCount,
          completionRate: cachedData.completionRate
        })
        this.filterEquipmentList()
        return
      }
      
      // 并行获取数据
      const [userEquipment, allTemplates] = await Promise.all([
        this.getUserEquipment(),
        this.getAllEquipmentTemplates()
      ])
      
      // 计算激活状态和统计数据
      const processedData = this.processEquipmentData(allTemplates, userEquipment)
      
      // 缓存结果
      wx.setStorageSync(cacheKey, {
        equipmentList: processedData.list,
        activatedCount: processedData.stats.activatedCount,
        totalCount: processedData.stats.totalCount,
        completionRate: processedData.stats.completionRate,
        timestamp: now
      })
      
      this.setData({
        equipmentList: processedData.list,
        activatedCount: processedData.stats.activatedCount,
        totalCount: processedData.stats.totalCount,
        completionRate: processedData.stats.completionRate
      })
      
      this.filterEquipmentList()
      
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取用户装备仓库
  async getUserEquipment() {
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('user_warehouse')
        .where({ openid: app.globalData.openid })
        .get()
      
      return data
    } catch (error) {
      return []
    }
  },

  // 获取所有装备模板（优先使用云函数）
  async getAllEquipmentTemplates() {
    try {
      // 直接使用云函数获取所有数据，性能更好
      const result = await wx.cloud.callFunction({
        name: 'getAllEquipmentTemplates'
      })
      
      if (result && result.result && result.result.code === 0) {
        return result.result.data
      } else {
        // 云函数失败时使用小程序端分批次获取作为备用方案
        return await this.getAllEquipmentTemplatesByClient()
      }
    } catch (error) {
      // 主方案失败时使用备用方案
      return await this.getAllEquipmentTemplatesByClient()
    }
  },

  // 备用方案：小程序端分批次获取
  async getAllEquipmentTemplatesByClient() {
    try {
      const db = wx.cloud.database()
      const MAX_BATCH_SIZE = 20 // 微信云开发限制
      
      // 先获取数据总数
      const countResult = await db.collection('equipment_templates').count()
      const total = countResult.total
      
      if (total === 0) {
        return []
      }
      
      // 计算需要分几次获取
      const batchTimes = Math.ceil(total / MAX_BATCH_SIZE)
      
      // 存储所有数据的数组
      let allData = []
      
      // 分批次获取数据
      for (let i = 0; i < batchTimes; i++) {
        const result = await db.collection('equipment_templates')
          .orderBy('createTime', 'desc')
          .skip(i * MAX_BATCH_SIZE)
          .limit(MAX_BATCH_SIZE)
          .get()
        
        allData = allData.concat(result.data)
        
        // 如果已经获取到足够的数据，提前结束
        if (allData.length >= total) {
          break
        }
      }
      
      return allData
    } catch (error) {
      return []
    }
  },

  // 通过云函数获取所有装备模板
  async getAllEquipmentTemplatesByCloudFunction() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getAllEquipmentTemplates',
        data: {}
      })
      
      // 检查云函数返回的数据结构
      if (result && result.result) {
        if (result.result.code === 0) {
          // 成功获取数据
          return result.result.data
        } else {
          // 云函数返回错误
          throw new Error(result.result.message)
        }
      } else {
        // 云函数调用失败
        throw new Error('云函数调用失败')
      }
    } catch (error) {
      throw error
    }
  },

  // 获取品质数值（用于兼容现有筛选逻辑）
  getRarityValue(equipment) {
    // 根据新的字段判断标准转换为数值
    if (equipment.rune) {
      return 0 // 符文之语对应数值0
    } else if (equipment.set) {
      return 7 // 套装对应数值7
    } else if (equipment.rarity) {
      return 1 // 暗金对应数值1
    }
    return -1 // 普通装备
  },

  // 处理装备数据
  processEquipmentData(templates, userEquipment) {
    // 去重：确保每个装备模板只显示一次
    const uniqueTemplates = []
    const templateMap = new Map()
    
    templates.forEach(template => {
      if (!templateMap.has(template._id)) {
        templateMap.set(template._id, template)
        uniqueTemplates.push(template)
      }
    })
    
    const activatedIds = new Set(userEquipment.map(item => item.templateId))
    
    const list = uniqueTemplates.map(template => {
      const isActivated = activatedIds.has(template._id)
      // 修复图片路径
      const fixedImage = template.image ? this.fixImagePath(template.image) : null
      const icon = fixedImage || this.getEquipmentIcon(template.type)
      
      // ✅ 核心修复 1：优先显示中文名
      // 如果有 name_zh 就用 name_zh，否则用 name (英文)
      const displayName = template.name_zh || template.name
      
      return {
        id: template._id,
        // ✅ 核心修复 1：优先显示中文名
        name: displayName,
        name_zh: template.name_zh || '', // ⚠️ 修复：确保不为 undefined
        name_en: template.name,     // 保留英文名用于搜索
        type: template.type,
        rarity: getRarityText(template), // 修复：使用新的品质判断逻辑
        rarityValue: this.getRarityValue(template), // 保留原始数值用于CSS类名判断
        icon: icon,
        isActivated: isActivated,
        image: fixedImage || '',
        activationTime: userEquipment.find(item => item.templateId === template._id)?.activationTime || null
      }
    })
    
    const stats = {
      activatedCount: activatedIds.size,
      totalCount: uniqueTemplates.length,
      completionRate: uniqueTemplates.length > 0 ? Math.round((activatedIds.size / uniqueTemplates.length) * 100) : 0
    }
    
    return { list, stats }
  },

  // 获取装备类型的图标
  getEquipmentIcon(type) {
    // 如果装备有图片路径，直接使用图片
    if (this.data.equipment && this.data.equipment.image) {
      return this.data.equipment.image
    }
    
    // 默认图标路径映射
    const iconMap = {
      '头部': '/images/equipment-icons/helmet.png',
      '盔甲': '/images/equipment-icons/armor.png',
      '腰带': '/images/equipment-icons/belt.png',
      '鞋子': '/images/equipment-icons/boots.png',
      '手套': '/images/equipment-icons/gloves.png',
      '戒指': '/images/equipment-icons/ring.png',
      '项链': '/images/equipment-icons/amulet.png',
      '手持': '/images/equipment-icons/weapon.png'
    }
    
    return iconMap[type] || '/images/equipment-icons/default.png'
  },

  // 修复图片路径格式
  fixImagePath(imagePath) {
    if (!imagePath || !imagePath.includes('cloud://')) {
      return imagePath
    }
    
    // 直接返回原始路径，让微信小程序处理云存储路径
    return imagePath
  },

  // 筛选装备列表（分批渲染优化版）
  filterEquipmentList() {
    const { equipmentList, currentTypeFilter, advancedFilters, searchKeyword, sortBy, sortOrder, pageSize } = this.data
    
    let filteredList = [...equipmentList]
    
    // 第二行：类型筛选（单选）
    if (currentTypeFilter !== 'all') {
      const typeMap = {
        'helmet': '头部',
        'armor': '盔甲',
        'belt': '腰带',
        'boots': '鞋子',
        'gloves': '手套',
        'ring': '戒指',
        'amulet': '项链',
        'weapon': '手持'
      }
      filteredList = filteredList.filter(item => item.type === typeMap[currentTypeFilter])
    }
    
    // 第三行：高级筛选（多选）
    if (advancedFilters) {
      // 稀有度筛选
      const rarityFilters = []
      if (advancedFilters.unique) rarityFilters.push(1) // 暗金对应数值1
      if (advancedFilters.suit) rarityFilters.push(7)   // 套装对应数值7
      if (advancedFilters.runeWord) rarityFilters.push(0) // 符文之语对应数值0
      
      if (rarityFilters.length > 0) {
        filteredList = filteredList.filter(item => rarityFilters.includes(item.rarityValue))
      }
      
      // 激活状态筛选
      const activationFilters = []
      if (advancedFilters.activated) activationFilters.push(true)
      if (advancedFilters.notActivated) activationFilters.push(false)
      
      if (activationFilters.length === 1) {
        // 如果只选择了一个激活状态，进行筛选
        filteredList = filteredList.filter(item => activationFilters.includes(item.isActivated))
      }
      // 如果两个都选或都不选，则不进行筛选（显示所有）
    }
    
    // 第一行：关键词搜索
    if (searchKeyword) {
      // 转换为小写进行不区分大小写的搜索
      const keywordLower = searchKeyword.toLowerCase()
      
      filteredList = filteredList.filter(item => {
        // ✅ 核心修复 3：同时匹配 中文名(name) 和 英文名(name_en)
        const nameMatch = (item.name && item.name.toLowerCase().includes(keywordLower)) || 
                          (item.name_en && item.name_en.toLowerCase().includes(keywordLower))
        
        // 类型和稀有度匹配
        const typeMatch = item.type.includes(searchKeyword)
        const rarityMatch = item.rarity.includes(searchKeyword)
        
        return nameMatch || typeMatch || rarityMatch
      })
    }
    
    // 排序
    filteredList = this.sortEquipmentList(filteredList, sortBy, sortOrder)
    
    // 1. 保存完整的筛选结果到内存（不渲染）
    this.fullFilteredList = filteredList; // 把结果存到 this 对象上，而不是 data 里
    
    // 2. 重置页码
    this.data.pageIndex = 1;
    
    // 3. 截取第一页数据进行渲染
    const firstPage = this.fullFilteredList.slice(0, pageSize);
    
    this.setData({ 
      filteredList: this.fullFilteredList, // 依然保存完整列表用于显示数量等
      displayList: firstPage // 页面上 wx:for 遍历这个 displayList
    });
  },

  // 排序装备列表
  sortEquipmentList(list, sortBy, sortOrder) {
    return list.sort((a, b) => {
      let valueA, valueB
      
      switch (sortBy) {
        case 'name':
          valueA = a.name
          valueB = b.name
          break
        case 'type':
          valueA = a.type
          valueB = b.type
          break
        case 'rarity':
          const rarityOrder = { '套装': 1, '暗金': 2, '符文之语': 3 }
          valueA = rarityOrder[a.rarity] || 0
          valueB = rarityOrder[b.rarity] || 0
          break
        case 'activation':
          valueA = a.isActivated ? 1 : 0
          valueB = b.isActivated ? 1 : 0
          break
        default:
          valueA = a.name
          valueB = b.name
      }
      
      if (sortOrder === 'desc') {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0
      } else {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0
      }
    })
  },

  // 切换排序方式
  toggleSort(e) {
    const { sortBy } = e.currentTarget.dataset
    const { sortBy: currentSortBy, sortOrder } = this.data
    
    if (sortBy === currentSortBy) {
      // 切换排序方向
      this.setData({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })
    } else {
      // 切换排序字段
      this.setData({ sortBy, sortOrder: 'asc' })
    }
    
    this.filterEquipmentList()
  },

  // 重置筛选条件
  resetFilters() {
    this.setData({
      currentTypeFilter: 'all',
      advancedFilters: {
        unique: true,
        suit: true,
        runeWord: true,
        activated: true,
        notActivated: true
      },
      searchKeyword: '',
      sortBy: 'name',
      sortOrder: 'asc'
    })
    
    this.filterEquipmentList()
    
    wx.showToast({
      title: '筛选条件已重置',
      icon: 'success'
    })
  },

  // 搜索输入处理（添加防抖）
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    
    // 清除之前的定时器
    clearTimeout(this.searchTimer)
    
    // 设置防抖定时器，300ms后执行搜索
    this.searchTimer = setTimeout(() => {
      this.setData({ searchKeyword: keyword })
      this.filterEquipmentList()
    }, 300)
  },

  // 图片懒加载处理 - 优化版：移除频繁的 setData 调用
  // 图片加载成功不需要更新状态，CSS 会处理显示逻辑
  onImageLoad(e) {
    // 静默处理，不需要调用 setData
    // CSS 会通过 opacity 和 transition 处理图片显示
  },

  // 图片加载失败处理 - 优化版：使用 CSS 默认背景图
  onImageError(e) {
    // 静默处理，不需要调用 setData
    // 通过 CSS 的 ::before 伪元素显示默认图标
    // 或者在 processEquipmentData 阶段已经处理了默认图标
    console.log('图片加载失败，使用CSS默认图标')
  },

  // 查看装备详情或跳转上传
  viewEquipment(e) {
    const { id, activated, name } = e.currentTarget.dataset
    
    if (!activated) {
      // 未激活装备：跳转到上传页面并自动选择装备
      wx.navigateTo({
        url: `/pages/upload/upload?templateId=${id}&equipmentName=${encodeURIComponent(name)}`
      })
      return
    }
    
    // 已激活装备：跳转到装备详情页
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
  },

  // 跳转到上传页面
  goToUpload() {
    wx.switchTab({
      url: '/pages/upload/upload'
    })
  },

  // 刷新数据
  async refreshData() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '刷新中...'
    })
    
    try {
      await this.loadCollectionData()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 分享功能
  onShareAppMessage() {
    const { currentShareId, currentShareName } = this.data
    
    if (currentShareId && currentShareName) {
      // 分享单个装备
      return {
        title: `我的暗黑2装备：${currentShareName}`,
        path: `/pages/detail/detail?id=${currentShareId}`,
        imageUrl: '/images/default-avatar.png'
      }
    } else {
      // 分享整个图鉴
      return {
        title: '暗黑2装备图鉴',
        path: '/pages/collection/collection',
        imageUrl: '/images/default-avatar.png'
      }
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '暗黑2装备图鉴 - 记录你的出货装备',
      imageUrl: '/images/default-avatar.png'
    }
  },

  // 长按装备卡片
  onLongPressEquipment(e) {
    console.log('长按事件触发', e.currentTarget.dataset)
    const { id, name, activated } = e.currentTarget.dataset
    
    if (!activated) {
      // 未激活装备：显示上传装备按钮
      console.log('长按未激活装备，显示上传按钮', id, name)
      wx.showActionSheet({
        itemList: ['上传装备'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 跳转到新的快速上传页面
            wx.navigateTo({
              url: `/pages/upload-quick/upload-quick?templateId=${id}&equipmentName=${encodeURIComponent(name)}`
            })
          }
        }
      })
      return
    }
    
    // 已激活装备：显示操作菜单
    console.log('长按已激活装备，显示操作菜单', id, name)
    wx.showActionSheet({
      itemList: ['上传装备', '分享装备'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 上传装备（已激活装备也可以重新上传）
          wx.navigateTo({
            url: `/pages/upload-quick/upload-quick?templateId=${id}&equipmentName=${encodeURIComponent(name)}`
          })
        } else if (res.tapIndex === 1) {
          this.shareEquipment(id, name)
        }
      }
    })
  },

  // 分享单个装备
  shareEquipment(id, name) {
    const { equipmentList } = this.data
    const equipment = equipmentList.find(item => item.id === id)
    
    if (!equipment) {
      wx.showToast({
        title: '装备信息获取失败',
        icon: 'none'
      })
      return
    }
    
    // 启用分享功能
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 设置当前分享的装备ID
    this.setData({
      currentShareId: id,
      currentShareName: name
    })
    
    // 提示用户使用右上角分享
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none',
      duration: 2000
    })
  },

  // 触底加载更多功能
  onReachBottom() {
    // 如果显示的长度已经等于总筛选长度，说明没数据了
    if (!this.fullFilteredList || this.data.displayList.length >= this.fullFilteredList.length) {
      return;
    }
    
    this.setData({ loading: true });
    
    // 计算下一页的数据
    const currentLen = this.data.displayList.length;
    const nextBatch = this.fullFilteredList.slice(currentLen, currentLen + this.data.pageSize);
    
    // 追加数据
    this.setData({
      displayList: this.data.displayList.concat(nextBatch),
      loading: false
    });
  }
})