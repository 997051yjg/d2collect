// pages/upload/upload.js
const app = getApp()
// ✅ 引入属性配置
const { getPropertyConfig } = require('../../utils/propertyMap.js')
// ✅ 引入品质判断函数
const { getRarityText } = require('../../utils/rarityMap.js')

Page({
  data: {
    isLoggedIn: false,
    uploadedImage: '',
    uploading: false,
    uploadProgress: 0,
    loading: false,
    formData: {
      name: '',
      attributes: {}
    },
    canSubmit: false,
    // 名称搜索相关
    searchKeyword: '',
    searchResults: [],
    showSearchResults: false,
    selectedEquipment: null
  },

  onLoad(options) {
    this.checkLoginStatus()
    
    // 如果有传递参数，自动选择对应装备
    if (options.templateId && options.equipmentName) {
      this.autoSelectEquipment(options.templateId, decodeURIComponent(options.equipmentName))
    }
  },

  onShow() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({ isLoggedIn })
  },

  // 自动选择装备
  async autoSelectEquipment(templateId, equipmentName) {
    try {
      const db = wx.cloud.database()
      
      // 根据templateId获取装备信息
      const { data: equipment } = await db.collection('equipment_templates')
        .doc(templateId)
        .get()
      
      if (equipment) {
        // ✅ 核心适配：处理属性列表（参考快速上传页面）
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

        // 设置表单数据（包含处理后的属性）
        this.setData({
          'formData.name': equipmentName,
          searchKeyword: equipmentName,
          selectedEquipment: {
            ...equipment,
            attributes: processedAttributes
          },
          searchResults: [equipment]
        })
        
        this.checkFormValidity()
        
        // 显示提示信息
        wx.showToast({
          title: `已自动选择装备：${equipmentName}`,
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('自动选择装备失败:', error)
      wx.showToast({
        title: '自动选择失败，请手动选择装备',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 跳转到登录
  goToLogin() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        // 检查图片大小（限制5MB）
        if (res.tempFiles[0].size > 5 * 1024 * 1024) {
          wx.showModal({
            title: '图片过大',
            content: '请选择小于5MB的图片',
            showCancel: false
          })
          return
        }
        
        this.setData({ 
          uploadedImage: tempFilePath
        })
        this.checkFormValidity()
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        
        let errorMessage = '选择图片失败'
        if (error.errMsg.includes('auth deny')) {
          errorMessage = '请授权访问相册或相机'
        } else if (error.errMsg.includes('cancel')) {
          return // 用户取消，不显示提示
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 删除图片
  removeImage() {
    this.setData({ 
      uploadedImage: '',
      canSubmit: false  // 禁用上传按钮
    })
    // 只清除图片，不重置装备选择器
  },

  // 重新上传
  reuploadImage() {
    // 直接调用chooseImage，不删除图片（让chooseImage覆盖当前图片）
    this.chooseImage()
  },

  // 输入框获得焦点时显示搜索结果
  onInputFocus() {
    if (this.data.searchResults.length > 0) {
      this.setData({
        showSearchResults: true
      })
    }
  },

  // 输入框失去焦点时隐藏搜索结果
  onInputBlur() {
    // 延迟隐藏，避免点击搜索结果时立即隐藏
    setTimeout(() => {
      // 检查页面是否仍然活跃，避免页面切换时的setData错误
      if (this && typeof this.setData === 'function') {
        this.setData({
          showSearchResults: false
        })
      }
    }, 200)
  },

  // 获取装备类型的图标
  getEquipmentIcon(type) {
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

  // 检查表单有效性
  checkFormValidity() {
    const { uploadedImage, selectedEquipment } = this.data
    
    // 只有同时选择了图片和装备信息才能上传
    const canSubmit = uploadedImage && selectedEquipment
    this.setData({ canSubmit })
  },

  // 重置表单
  resetForm() {
    this.setData({
      formData: {
        name: ''
      },
      searchKeyword: '',
      searchResults: [],
      showSearchResults: false,
      selectedEquipment: null,
      canSubmit: false
    })
  },

  // 名称输入变化（优化防抖）
  onNameInput(e) {
    const keyword = e.detail.value
    this.setData({
      'formData.name': keyword,
      searchKeyword: keyword
    })
    
    // 延迟搜索，避免频繁请求
    clearTimeout(this.searchTimer)
    
    // 只有关键词长度大于等于1时才搜索
    if (keyword.trim().length >= 1) {
      this.searchTimer = setTimeout(() => {
        this.searchEquipment(keyword.trim())
      }, 500)
    } else {
      // 清空搜索结果
      this.setData({
        searchResults: [],
        showSearchResults: false
      })
    }
  },

  // 搜索装备
  async searchEquipment(keyword) {
    if (!keyword || keyword.trim().length === 0) {
      this.setData({
        searchResults: [],
        showSearchResults: false
      })
      return
    }

    try {
      const db = wx.cloud.database()
      
      // ✅ 修改查询条件：同时搜中文名和英文名
      const _ = db.command
      const { data: results } = await db.collection('equipment_templates')
        .where(_.or([
          {
            name_zh: db.RegExp({ regexp: keyword, options: 'i' })
          },
          {
            name: db.RegExp({ regexp: keyword, options: 'i' })
          }
        ]))
        .limit(10)
        .get()
      
      // ✅ 处理结果：优先显示中文名，使用新的品质判断
      const processedResults = results.map(item => ({
        ...item,
        name: item.name_zh || item.name, // 优先显示中文名
        rarity: getRarityText(item) // 使用新的品质判断
      }))
      
      this.setData({
        searchResults: processedResults,
        showSearchResults: processedResults.length > 0
      })
    } catch (error) {
      console.error('搜索装备失败:', error)
      this.setData({
        searchResults: [],
        showSearchResults: false
      })
    }
  },

  // 选择装备
  selectEquipment(e) {
    const { index } = e.currentTarget.dataset
    const equipment = this.data.searchResults[index]
    
    // 如果点击的是已选中的装备，则取消选中
    if (this.data.selectedEquipment && this.data.selectedEquipment._id === equipment._id) {
      this.setData({
        selectedEquipment: null,
        'formData.name': '',
        'formData.attributes': {}
      })
    } else {
      // ✅ 核心适配：处理属性列表（参考快速上传页面）
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
      
      // ✅ 自动为固定属性设置默认值
      const initialAttributes = {}
      processedAttributes.forEach(attr => {
        if (!attr.isVariable) {
          // 固定属性使用默认值
          initialAttributes[attr.code] = attr.min
        }
      })
      
      // 否则选中新装备（包含处理后的属性）
      this.setData({
        selectedEquipment: {
          ...equipment,
          attributes: processedAttributes,
          rarity: getRarityText(equipment) // ✅ 修复品质显示
        },
        'formData.name': equipment.name_zh || equipment.name,
        'formData.attributes': initialAttributes
      })
    }
    
    this.checkFormValidity()
  },

  // 属性输入变化
  onAttributeInput(e) {
    const { code } = e.currentTarget.dataset
    const value = e.detail.value
    
    // 获取装备属性配置
    const attribute = this.data.selectedEquipment.attributes.find(attr => attr.code === code)
    if (!attribute) return
    
    // 验证数值范围
    let validatedValue = value
    if (value !== '') {
      const numValue = parseInt(value)
      if (numValue < attribute.min) {
        validatedValue = attribute.min.toString()
      } else if (numValue > attribute.max) {
        validatedValue = attribute.max.toString()
      }
    }
    
    // 更新属性数据
    this.setData({
      [`formData.attributes.${code}`]: validatedValue
    })
  },

  // 隐藏搜索结果
  hideSearchResults() {
    this.setData({
      showSearchResults: false
    })
  },

  // 提交表单
  async submitForm() {
    // 检查登录状态
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    // 验证装备名称长度
    const { name } = this.data.formData
    if (name.length > 50) {
      wx.showToast({
        title: '装备名称不能超过50个字符',
        icon: 'none'
      })
      return
    }

    // 显示确认对话框
    wx.showModal({
      title: '确认上传',
      content: `确定要上传装备"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ uploading: true, uploadProgress: 0 })
            
            // 上传图片到云存储
            const uploadResult = await this.uploadImage()
            
            // 创建装备记录
            await this.createEquipmentRecord(uploadResult.fileID)
            
            this.setData({ uploading: false })
            
            wx.showToast({
              title: '上传成功',
              icon: 'success',
              duration: 2000
            })
            
            // 设置刷新标志，通知图鉴页面和主页面刷新数据
            wx.setStorageSync('shouldRefreshCollection', true)
            wx.setStorageSync('shouldRefreshStats', true)
            
            // 重置表单
            this.setData({ uploadedImage: '' })
            this.resetForm()
            
            // 延迟切换到图鉴页面，确保用户看到成功提示
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/collection/collection'
              })
            }, 1500)
            
            
          } catch (error) {
            this.setData({ uploading: false })
            console.error('上传失败:', error)
            
            // 提供更详细的错误信息
            let errorMessage = '上传失败，请重试'
            if (error.errMsg && error.errMsg.includes('network')) {
              errorMessage = '网络连接失败，请检查网络设置'
            } else if (error.errMsg && error.errMsg.includes('file not exist')) {
              errorMessage = '图片文件不存在，请重新选择'
            } else if (error.errMsg && error.errMsg.includes('permission denied')) {
              errorMessage = '数据库权限不足，请检查云环境配置'
            } else if (error.errMsg && error.errMsg.includes('database')) {
              errorMessage = '数据库操作失败，请检查云环境是否正确配置'
            }
            
            wx.showModal({
              title: '上传失败',
              content: errorMessage + '错误详情：' + error.errMsg,
              showCancel: false
            })
          }
        }
      }
    })
  },

  // 上传图片
  uploadImage() {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: `equipments/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
        filePath: this.data.uploadedImage,
        onUploadProgress: (res) => {
          const progress = Math.round((res.loaded / res.total) * 100)
          this.setData({ uploadProgress: progress })
        },
        success: resolve,
        fail: reject
      })
    })
  },

  // 创建装备记录
  async createEquipmentRecord(imageUrl) {
    // 处理属性数据
    const attributes = {}
    if (this.data.selectedEquipment?.attributes && this.data.formData?.attributes) {
      this.data.selectedEquipment.attributes.forEach(attr => {
        if (this.data.formData.attributes[attr.code] && this.data.formData.attributes[attr.code] !== '') {
          attributes[attr.code] = parseInt(this.data.formData.attributes[attr.code])
        }
      })
    }
    
    // 调用云函数，安全且无权限问题
    const { result } = await wx.cloud.callFunction({
      name: 'saveUserEquipment',
      data: {
        templateId: this.data.selectedEquipment?._id,
        equipmentName: this.data.formData?.name,
        imageUrl: imageUrl,
        attributes: attributes,
        item_id: this.data.selectedEquipment?._id, // 新增 item_id 字段，对应模板库的装备ID
        openid: app.globalData.openid // 修复：添加 openid 参数
      }
    })

    if (!result.success) {
      throw new Error(result.error)
    }
    
    console.log('装备保存成功:', result.action)
  },
})