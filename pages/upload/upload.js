// pages/upload/upload.js
const app = getApp()
// 引入工具类
const { getPropertyConfig } = require('../../utils/propertyMap.js')
const { getRarityText } = require('../../utils/rarityMap.js')

Page({
  data: {
    isLoggedIn: false,
    loading: false,

    // --- 状态控制 ---
    // 核心状态：是否有选中的装备。
    // null = 搜索模式；有对象 = 编辑模式
    selectedEquipment: null, 
    
    // --- 搜索模式数据 ---
    searchKeyword: '',
    searchResults: [],
    showSearchResults: false,

    // --- 编辑模式表单数据 ---
    uploadedImage: '',
    formData: {
      name: '',       // 装备名称
      attributes: {}  // 存储属性值 { code: value }
    },

    // --- 上传状态 ---
    uploading: false,
    uploadProgress: 0,
    canSubmit: false
  },

  // pages/upload/upload.js 中的 onShow 和 onLoad 修改

  onLoad(options) {
    this.checkLoginStatus()
    // 注意：如果是 TabBar 页面，第一次启动时 options 可能为空
    // 这里的原有逻辑可以保留，作为非 Tab 跳转的兼容（防御性编程）
    if (options.templateId) {
      const name = options.equipmentName ? decodeURIComponent(options.equipmentName) : ''
      this.loadTargetEquipment(options.templateId, name)
    }
  },

  onShow() {
    this.checkLoginStatus()
    
    // --- 新增：检查是否有跨页面传递的参数 ---
    this.checkExternalParams()
  },

  // --- 新增：专门处理外部参数的方法 ---
  checkExternalParams() {
    // 1. 读取缓存
    const pendingData = wx.getStorageSync('pendingUpload')
    
    if (pendingData) {
      console.log('收到跳转参数:', pendingData)
      
      // 2. 立即清除缓存（阅后即焚，防止下次切回来重复触发）
      wx.removeStorageSync('pendingUpload')
      
      // 3. 执行加载逻辑
      // 注意：decodeURIComponent 可能在存的时候没转码，这里直接用即可
      // 这里的 pendingData.equipmentName 应该是原始字符串
      this.loadTargetEquipment(pendingData.templateId, pendingData.equipmentName)
    }
  },

  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({ isLoggedIn })
  },

  // ====================================================
  // 核心逻辑 1：装备数据处理与加载
  // ====================================================

  async loadTargetEquipment(templateId, equipmentName) {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const { data: equipment } = await db.collection('equipment_templates')
        .doc(templateId)
        .get()

      if (equipment) {
        this.processTemplateToEditor(equipment, equipmentName)
      }
    } catch (error) {
      console.error('加载装备失败', error)
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  processTemplateToEditor(equipment, overrideName = '') {
    // 1. 处理属性显示配置
    const processedAttributes = (equipment.attributes || []).map(attr => {
      const config = getPropertyConfig(attr.code)
      
      let displayText = ''
      if (!attr.isVariable) {
        displayText = config.format.replace('{0}', attr.min)
        if (attr.param) displayText = displayText.replace('{p}', attr.param)
      }

      return {
        ...attr,
        label: config.label,
        displayColor: config.color,
        displayText: displayText
      }
    })

    // 2. 初始化表单数据
    const initialAttributes = {}
    processedAttributes.forEach(attr => {
      if (!attr.isVariable) {
        initialAttributes[attr.code] = attr.min
      } else {
        initialAttributes[attr.code] = null
      }
    })

    // 3. 更新状态
    this.setData({
      selectedEquipment: {
        ...equipment,
        name: equipment.name_zh || overrideName || equipment.name,
        image: equipment.image, 
        rarity: getRarityText(equipment),
        attributes: processedAttributes 
      },
      formData: {
        name: equipment.name_zh || overrideName || equipment.name,
        attributes: initialAttributes
      },
      searchKeyword: '',
      searchResults: [],
      showSearchResults: false
    })

    // 4. 初始化校验
    this.checkFormValidity()
  },

  // ====================================================
  // 核心逻辑 2：搜索模式交互
  // ====================================================

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })

    clearTimeout(this.searchTimer)
    if (keyword.trim().length >= 1) {
      this.searchTimer = setTimeout(() => {
        this.executeSearch(keyword.trim())
      }, 500)
    } else {
      this.setData({ searchResults: [], showSearchResults: false })
    }
  },

  async executeSearch(keyword) {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      const { data: results } = await db.collection('equipment_templates')
        .where(_.or([
          { name_zh: db.RegExp({ regexp: keyword, options: 'i' }) },
          { name: db.RegExp({ regexp: keyword, options: 'i' }) }
        ]))
        .limit(10)
        .get()

      const processedResults = results.map(item => ({
        ...item,
        name: item.name_zh || item.name,
        rarity: getRarityText(item)
      }))

      this.setData({
        searchResults: processedResults,
        showSearchResults: processedResults.length > 0
      })
    } catch (error) {
      console.error('搜索失败', error)
    }
  },

  onSelectSearchResult(e) {
    const { index } = e.currentTarget.dataset
    const equipment = this.data.searchResults[index]
    this.processTemplateToEditor(equipment)
  },

  resetToSearchMode() {
    this.setData({
      selectedEquipment: null,
      uploadedImage: '',
      formData: { name: '', attributes: {} },
      canSubmit: false,
      searchKeyword: ''
    })
  },

  // ====================================================
  // 核心逻辑 3：编辑模式交互
  // ====================================================

  // 【核心修改】监听输入并立即校验
  onAttributeInput(e) {
    const { code } = e.currentTarget.dataset
    const value = e.detail.value
    
    const key = `formData.attributes.${code}`
    
    // 使用回调函数，确保数据更新后立即检查按钮状态
    this.setData({
      [key]: value
    }, () => {
      this.checkFormValidity()
    })
  },

  // 失去焦点时进行范围修正（优化体验）
  onAttributeBlur(e) {
    const { code } = e.currentTarget.dataset
    let value = e.detail.value
    const attrConfig = this.data.selectedEquipment.attributes.find(a => a.code === code)

    if (value !== '' && attrConfig) {
      let numVal = parseInt(value)
      if (!isNaN(numVal)) {
        // 只有当数值超出范围时才自动修正
        if (numVal < attrConfig.min) numVal = attrConfig.min
        if (numVal > attrConfig.max) numVal = attrConfig.max
        
        // 更新修正后的值
        const key = `formData.attributes.${code}`
        this.setData({ [key]: numVal }, () => {
          this.checkFormValidity()
        })
      }
    }
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        if (res.tempFiles[0].size > 5 * 1024 * 1024) {
          return wx.showToast({ title: '图片过大(>5MB)', icon: 'none' })
        }
        
        this.setData({ uploadedImage: res.tempFiles[0].tempFilePath }, () => {
          this.checkFormValidity()
        })
      }
    })
  },

  removeImage() {
    this.setData({ uploadedImage: '' }, () => {
      this.checkFormValidity()
    })
  },

  // 【核心修改】表单校验逻辑：装备 + 图片 + 所有变量属性必填
  checkFormValidity() {
    const hasEquipment = !!this.data.selectedEquipment
    const hasImage = !!this.data.uploadedImage
    
    // 检查所有可变属性是否已填
    let allAttrsFilled = true
    
    if (hasEquipment && this.data.selectedEquipment.attributes) {
      const attrs = this.data.selectedEquipment.attributes
      const formAttrs = this.data.formData.attributes
      
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i]
        // 只有 isVariable 为 true 的属性需要检查
        if (attr.isVariable) {
          const val = formAttrs[attr.code]
          // 检查是否为空 (null, undefined, 或空字符串)
          // 注意：数字 0 是有效值，不能简单用 !val 判断
          if (val === null || val === undefined || val === '') {
            allAttrsFilled = false
            break // 只要有一个没填，就校验失败
          }
        }
      }
    }

    const canSubmit = hasEquipment && hasImage && allAttrsFilled
    
    if (canSubmit !== this.data.canSubmit) {
      this.setData({ canSubmit })
    }
  },

  // ====================================================
  // 核心逻辑 4：提交与上传
  // ====================================================

  // 提交前的二次校验（防止漏网之鱼，并提示具体错误）
  validateAttributesOnSubmit() {
    const rawAttrs = this.data.formData.attributes
    const equipmentAttrs = this.data.selectedEquipment.attributes
    
    for (let attr of equipmentAttrs) {
      if (attr.isVariable) {
        const val = parseInt(rawAttrs[attr.code])
        if (isNaN(val)) {
          wx.showToast({ title: `请填写 ${attr.label}`, icon: 'none' })
          return false
        }
        // 提交时再严格卡控范围
        if (val < attr.min || val > attr.max) {
          wx.showToast({ title: `${attr.label} 数值应在 ${attr.min}-${attr.max} 之间`, icon: 'none' })
          return false
        }
      }
    }
    return true
  },

  async submitForm() {
    if (!this.data.isLoggedIn) return
    if (!this.data.canSubmit) return // 双重保险
    
    // 提交时的严格校验
    if (!this.validateAttributesOnSubmit()) return

    const equipmentName = this.data.formData.name

    wx.showModal({
      title: '确认上传',
      content: `确定要上传 "${equipmentName}" 吗？`,
      success: async (res) => {
        if (res.confirm) {
          this.executeUpload()
        }
      }
    })
  },

  async executeUpload() {
    try {
      this.setData({ uploading: true, uploadProgress: 0 })

      // 1. 上传图片
      const fileID = await this.uploadImageFile()

      // 2. 清理属性数据
      const finalAttributes = {}
      const rawAttrs = this.data.formData.attributes
      for (let key in rawAttrs) {
        if (rawAttrs[key] !== null && rawAttrs[key] !== '') {
          finalAttributes[key] = parseInt(rawAttrs[key])
        }
      }

      // 3. 调用云函数
      await wx.cloud.callFunction({
        name: 'saveUserEquipment',
        data: {
          openid: app.globalData.openid,
          templateId: this.data.selectedEquipment._id,
          item_id: this.data.selectedEquipment._id,
          equipmentName: this.data.formData.name,
          imageUrl: fileID,
          attributes: finalAttributes
        }
      })

      this.handleUploadSuccess()

    } catch (error) {
      console.error('上传流程失败', error)
      wx.showModal({
        title: '上传失败',
        content: error.message || '网络或数据库异常',
        showCancel: false
      })
    } finally {
      this.setData({ uploading: false })
    }
  },

  uploadImageFile() {
    return new Promise((resolve, reject) => {
      const cloudPath = `equipments/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const uploadTask = wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.uploadedImage,
        success: res => resolve(res.fileID),
        fail: reject
      })

      uploadTask.onProgressUpdate((res) => {
        this.setData({ uploadProgress: res.progress })
      })
    })
  },

  handleUploadSuccess() {
    wx.showToast({ title: '上传成功', icon: 'success' })
    wx.setStorageSync('shouldRefreshCollection', true)
    wx.setStorageSync('shouldRefreshStats', true)

    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.switchTab({ url: '/pages/collection/collection' })
      }
    }, 1500)
  },

  goToLogin() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})