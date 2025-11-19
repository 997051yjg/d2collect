// pages/collection/collection.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    loading: false,
    currentFilter: 'all',
    currentRarityFilter: 'all',
    searchKeyword: '',
    equipmentList: [],
    filteredList: [],
    activatedCount: 0,
    totalCount: 0,
    completionRate: 0,
    showFilterPanel: false,
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

  // 设置筛选条件
  setFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ currentFilter: filter })
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
    const { equipmentList, currentFilter, currentRarityFilter, searchKeyword, sortBy, sortOrder } = this.data
    
    let filteredList = [...equipmentList]
    
    // 基础筛选
    if (currentFilter !== 'all') {
      if (currentFilter === 'active') {
        filteredList = filteredList.filter(item => item.isActivated)
      } else {
        // 类型筛选
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
        filteredList = filteredList.filter(item => item.type === typeMap[currentFilter])
      }
    }
    
    // 稀有度筛选
    if (currentRarityFilter !== 'all') {
      filteredList = filteredList.filter(item => item.rarity === currentRarityFilter)
    }
    
    // 关键词搜索
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

  // 设置稀有度筛选
  setRarityFilter(e) {
    const rarity = e.currentTarget.dataset.rarity
    this.setData({ currentRarityFilter: rarity })
    this.filterEquipmentList()
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

  // 显示/隐藏筛选面板
  toggleFilterPanel() {
    this.setData({ showFilterPanel: !this.data.showFilterPanel })
  },

  // 重置筛选条件
  resetFilters() {
    this.setData({
      currentFilter: 'all',
      currentRarityFilter: 'all',
      searchKeyword: '',
      sortBy: 'name',
      sortOrder: 'asc',
      showFilterPanel: false
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

  // 查看装备详情
  viewEquipment(e) {
    const { id, activated } = e.currentTarget.dataset
    
    if (!activated) {
      wx.showModal({
        title: '未激活',
        content: '该装备尚未激活，请先上传对应装备',
        showCancel: false
      })
      return
    }
    
    // 跳转到装备详情页
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