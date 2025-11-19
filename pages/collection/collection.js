// pages/collection/collection.js
const app = getApp()

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
    sortBy: 'name', // name, type, rarity, activation
    sortOrder: 'asc' // asc, desc
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
    if (this.data.isLoggedIn) {
      this.loadCollectionData()
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

  // 切换筛选面板显示状态
  toggleFilterPanel() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    })
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

  // 加载图鉴数据
  async loadCollectionData() {
    try {
      this.setData({ loading: true })
      
      // 获取用户装备仓库
      const userEquipment = await this.getUserEquipment()
      // 获取所有装备模板
      const allTemplates = await this.getAllEquipmentTemplates()
      
      // 计算激活状态和统计数据
      const processedData = this.processEquipmentData(allTemplates, userEquipment)
      
      this.setData({
        equipmentList: processedData.list,
        activatedCount: processedData.stats.activatedCount,
        totalCount: processedData.stats.totalCount,
        completionRate: processedData.stats.completionRate
      })
      
      this.filterEquipmentList()
      
    } catch (error) {
      console.error('加载图鉴数据失败:', error)
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
      console.error('获取用户装备失败:', error)
      return []
    }
  },

  // 获取所有装备模板
  async getAllEquipmentTemplates() {
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('equipment_templates')
        .orderBy('createTime', 'desc')
        .get()
      
      return data
    } catch (error) {
      console.error('获取装备模板失败:', error)
      return []
    }
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
      const icon = template.image || this.getEquipmentIcon(template.type)
      
      return {
        id: template._id,
        name: template.name,
        type: template.type,
        rarity: template.rarity,
        icon: icon,
        isActivated: isActivated,
        image: template.image || '',
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

  // 筛选装备列表
  filterEquipmentList() {
    const { equipmentList, currentTypeFilter, advancedFilters, searchKeyword, sortBy, sortOrder } = this.data
    
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
      if (advancedFilters.unique) rarityFilters.push('暗金')
      if (advancedFilters.suit) rarityFilters.push('套装')
      if (advancedFilters.runeWord) rarityFilters.push('符文之语')
      
      if (rarityFilters.length > 0) {
        filteredList = filteredList.filter(item => rarityFilters.includes(item.rarity))
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
      filteredList = filteredList.filter(item => 
        item.name.includes(searchKeyword) || 
        item.type.includes(searchKeyword) || 
        item.rarity.includes(searchKeyword)
      )
    }
    
    // 排序
    filteredList = this.sortEquipmentList(filteredList, sortBy, sortOrder)
    
    this.setData({ filteredList })
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

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ searchKeyword: keyword })
    this.filterEquipmentList()
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
    const { id, name, activated } = e.currentTarget.dataset
    
    if (!activated) {
      return
    }
    
    wx.showActionSheet({
      itemList: ['查看详情', '分享装备'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.viewEquipment(e)
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
  }
})