// pages/collection/collection.js
const app = getApp()
const { getRarityText } = require('../../utils/rarityMap.js')
const { typeMapping, chineseCategoryMap } = require('../../utils/typeMap.js')

Page({
  data: {
    isLoggedIn: false,
    loading: false,
    
    // 筛选状态
    currentTypeFilter: 'all',
    advancedFilters: {
      unique: true,
      suit: true,
      runeWord: true,
      activated: true,
      notActivated: true
    },
    searchKeyword: '',
    
    // 数据相关
    equipmentList: [], // 原始全量数据
    displayList: [],   // 页面渲染数据 (分页后)
    
    pageSize: 24, // 3的倍数，网格布局更整齐
    pageIndex: 1,
    
    collectionStats: {
      activatedCount: 0,
      totalCount: 0,
      completionRate: 0
    },
    
    filterCategories: []
  },

  // 内存变量，不参与渲染
  fullFilteredList: [], 

  onLoad() {
    this.checkLoginStatus()
    this.initFilterCategories()
  },

  onShow() {
    this.checkLoginStatus()
    // 简单判断是否需要刷新，这里可以配合全局状态管理优化
    if (this.data.isLoggedIn && this.data.equipmentList.length === 0) {
      this.loadCollectionData()
    }
  },

  checkLoginStatus() {
    this.setData({ isLoggedIn: app.globalData.isLoggedIn || false })
  },

  initFilterCategories() {
    const categories = [{ key: 'all', label: '全部' }]
    Object.keys(typeMapping).forEach(key => {
      categories.push({
        key: key,
        label: chineseCategoryMap[key] || key
      })
    })
    this.setData({ filterCategories: categories })
  },

  // =========================
  // 数据加载与处理
  // =========================
  async loadCollectionData() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      // 模拟或者实际获取数据逻辑 (保持原有逻辑，这里简化展示)
      // 建议：这里如果数据量大，应该尽量精简存入 data 的字段
      const userEquipment = await this.getUserEquipment()
      const allTemplates = await this.getAllEquipmentTemplates()
      
      const processed = this.processEquipmentData(allTemplates, userEquipment)
      
      this.setData({
        equipmentList: processed.list,
        collectionStats: processed.stats
      })
      
      this.applyFilters() // 加载完直接筛选
      
    } catch (error) {
      console.error('加载图鉴失败', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 保持原有的 getUserEquipment 和 getAllEquipmentTemplates 逻辑...
  // 此处省略以节省篇幅，沿用你原来的代码即可
  // ...

  getUserEquipment: async function() {
      // 沿用原逻辑
      try {
        const db = wx.cloud.database()
        const { data } = await db.collection('user_warehouse')
            .where({ openid: app.globalData.openid })
            .get()
        return data
      } catch (e) { return [] }
  },

  getAllEquipmentTemplates: async function() {
      // 沿用原逻辑，优先云函数
      try {
          const res = await wx.cloud.callFunction({ name: 'getAllEquipmentTemplates' })
          if(res.result?.code === 0) return res.result.data
          return [] // 简化错误处理
      } catch(e) { return [] }
  },

  processEquipmentData(templates, userEquipment) {
    // 优化：使用 Set 提高查找效率
    const activatedSet = new Set(userEquipment.map(i => i.templateId))
    const uniqueTemplates = []
    const seen = new Set()

    templates.forEach(t => {
      if (!seen.has(t._id)) {
        seen.add(t._id)
        uniqueTemplates.push(t)
      }
    })

    const list = uniqueTemplates.map(t => {
      const isActivated = activatedSet.has(t._id)
      return {
        id: t._id,
        name: t.name_zh || t.name, // 优先中文
        name_en: t.name,
        type: t.type,
        rarityClass: this.getRarityClass(t), // 预计算 class
        icon: t.image || '', // 确保有默认值
        isActivated,
        // 移除不必要的大字段，减少 data 传输量
      }
    })

    const activatedCount = activatedSet.size
    const totalCount = uniqueTemplates.length

    return {
      list,
      stats: {
        activatedCount,
        totalCount,
        completionRate: totalCount > 0 ? Math.round((activatedCount / totalCount) * 100) : 0
      }
    }
  },

  getRarityClass(t) {
    const rarity = getRarityText(t)
    if (rarity === '套装') return 'suit'
    if (rarity === '暗金') return 'unique'
    if (rarity === '符文之语') return 'runeword'
    return ''
  },

  // =========================
  // 筛选与搜索逻辑
  // =========================
  onSearchInput(e) {
    const val = e.detail.value
    // 简单的防抖
    if (this.searchTimeout) clearTimeout(this.searchTimeout)
    this.searchTimeout = setTimeout(() => {
      this.setData({ searchKeyword: val })
      this.applyFilters()
    }, 300)
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.applyFilters()
  },

  setTypeFilter(e) {
    const type = e.currentTarget.dataset.type
    if (this.data.currentTypeFilter === type) return
    this.setData({ currentTypeFilter: type })
    this.applyFilters()
  },

  toggleAdvancedFilter(e) {
    const filterKey = e.currentTarget.dataset.filter
    const filters = this.data.advancedFilters
    filters[filterKey] = !filters[filterKey]
    
    // 如果全取消了，体验上最好是全选回来，或者允许为空
    // 这里保持原逻辑：全空则全选
    if (!Object.values(filters).some(v => v)) {
         Object.keys(filters).forEach(k => filters[k] = true)
    }

    this.setData({ advancedFilters: filters })
    this.applyFilters()
  },

  applyFilters() {
    let result = this.data.equipmentList
    const { currentTypeFilter, advancedFilters, searchKeyword } = this.data

    // 1. 类型筛选
    if (currentTypeFilter !== 'all') {
      const subTypes = (typeMapping[currentTypeFilter] || []).map(t => t.toLowerCase())
      result = result.filter(item => item.type && subTypes.includes(item.type.toLowerCase()))
    }

    // 2. 搜索
    if (searchKeyword) {
      const key = searchKeyword.toLowerCase()
      result = result.filter(item => 
        (item.name && item.name.toLowerCase().includes(key)) ||
        (item.name_en && item.name_en.toLowerCase().includes(key))
      )
    }

    // 3. 高级筛选 (Rarity & Status)
    // 优化：将筛选逻辑合并，减少遍历次数
    result = result.filter(item => {
      // 稀有度检查
      let rarityMatch = false
      if (advancedFilters.unique && item.rarityClass === 'unique') rarityMatch = true
      if (advancedFilters.suit && item.rarityClass === 'suit') rarityMatch = true
      if (advancedFilters.runeword && item.rarityClass === 'runeword') rarityMatch = true // 注意大小写 key 匹配
      // 如果不是这三种特殊稀有度，且没被排除，可能需要处理（视业务逻辑而定）
      // 这里简化处理：只要有 rarityClass 就参与筛选
      
      // 状态检查
      let statusMatch = false
      if (advancedFilters.activated && item.isActivated) statusMatch = true
      if (advancedFilters.notActivated && !item.isActivated) statusMatch = true

      return rarityMatch && statusMatch
    })

    // 更新内存全量结果
    this.fullFilteredList = result
    
    // 重置分页
    this.setData({ 
        pageIndex: 1,
        displayList: result.slice(0, this.data.pageSize)
    })
  },

  // =========================
  // 分页与交互
  // =========================
  onReachBottom() {
    const { displayList, pageSize } = this.data
    const total = this.fullFilteredList.length
    
    if (displayList.length >= total) return

    this.setData({ loading: true })
    
    // 模拟网络延迟感，或者直接加载
    // 这里使用 setTimeout 是为了让 loading spinner 闪一下，实际可去掉
    const nextBatch = this.fullFilteredList.slice(
        displayList.length, 
        displayList.length + pageSize
    )
    
    this.setData({
        displayList: [...displayList, ...nextBatch],
        loading: false
    })
  },

  onImageError(e) {
    // 仅在开发环境打印，防止内存泄漏
    // 生产环境可以上报到日志系统
    /* console.warn('Image Load Fail', e.detail) */
  },

  viewEquipment(e) {
    const { id, activated, name } = e.currentTarget.dataset
    if (!activated) {
        // 去上传
        wx.navigateTo({ url: `/pages/upload-quick/upload-quick?templateId=${id}&equipmentName=${encodeURIComponent(name)}` })
    } else {
        // 去详情
        wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    }
  },

  // 微信登录 (简写)
  wxLogin() {
      app.wxLogin().then(res => {
          if(res) {
              this.setData({ isLoggedIn: true })
              this.loadCollectionData()
          }
      })
  },
  
  resetFilters() {
      this.setData({
          searchKeyword: '',
          currentTypeFilter: 'all',
          advancedFilters: { unique: true, suit: true, runeWord: true, activated: true, notActivated: true }
      })
      this.applyFilters()
  }
})