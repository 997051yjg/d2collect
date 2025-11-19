// pages/upload/upload.js
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    uploadedImage: '',
    uploading: false,
    uploadProgress: 0,
    loading: false,
    formData: {
      name: ''
    },
    canSubmit: false,
    // 名称搜索相关
    searchKeyword: '',
    searchResults: [],
    showSearchResults: false,
    selectedEquipment: null
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    this.setData({ isLoggedIn })
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
    this.setData({ uploadedImage: '' })
    this.resetForm()
  },

  // 重新上传
  reuploadImage() {
    this.removeImage()
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
      this.setData({
        showSearchResults: false
      })
    }, 200)
  },

  // 获取装备类型的emoji
  getEquipmentEmoji(type) {
    const emojiMap = {
      '武器': '⚔️',
      '防具': '🛡️',
      '饰品': '💍',
      '符文': '🔣',
      '药水': '🧪',
      '卷轴': '📜'
    }
    
    return emojiMap[type] || '❓'
  },

  // 检查表单有效性
  checkFormValidity() {
    const { name } = this.data.formData
    const { uploadedImage, selectedEquipment } = this.data
    
    const canSubmit = uploadedImage && name && selectedEquipment
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

  // 名称输入变化
  onNameInput(e) {
    const keyword = e.detail.value
    this.setData({
      'formData.name': keyword,
      searchKeyword: keyword
    })
    
    // 延迟搜索，避免频繁请求
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.searchEquipment(keyword)
    }, 300)
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
      
      // 搜索装备模板库，只查询已存在的模板
      const { data: results } = await db.collection('equipment_templates')
        .where({
          name: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
        .limit(10)
        .get()
      
      this.setData({
        searchResults: results,
        showSearchResults: results.length > 0
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
        'formData.name': ''
      })
    } else {
      // 否则选中新装备
      this.setData({
        selectedEquipment: equipment,
        'formData.name': equipment.name
      })
    }
    
    this.checkFormValidity()
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
            
            // 重置表单
            this.setData({ uploadedImage: '' })
            this.resetForm()
            
            // 检查成就
            this.checkAchievements()
            
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
    const db = wx.cloud.database()
    const { formData, selectedEquipment } = this.data
    const now = new Date()
    
    // 检查是否已存在相同装备的记录
    let existingRecord = null
    let oldImageUrl = null
    
    // 检查openid是否存在
    if (!app.globalData.openid) {
      throw new Error('用户未登录，无法保存装备记录')
    }
    
    try {
      // 查询是否已存在相同装备名称的用户记录
      const { data: existingRecords } = await db.collection('user_warehouse')
        .where({
          openid: app.globalData.openid,
          equipmentName: formData.name
        })
        .get()
      
      if (existingRecords.length > 0) {
        existingRecord = existingRecords[0]
        // 保存旧图片URL用于后续删除
        if (existingRecord.images && existingRecord.images.length > 0) {
          oldImageUrl = existingRecord.images[0]
        }
      }
    } catch (error) {
      console.warn('查询现有装备记录失败，可能是权限问题:', error)
      // 如果是权限错误，继续创建新记录
      if (error.errMsg && error.errMsg.includes('permission denied')) {
        console.log('权限错误，跳过查询直接创建新记录')
      } else {
        throw error
      }
    }
    
    // 确保选中的装备模板存在
    let templateId = selectedEquipment ? selectedEquipment._id : null
    
    if (!templateId) {
      console.error('未选择有效的装备模板')
      throw new Error('请选择有效的装备')
    }
    
    // 创建或更新用户装备记录
    if (existingRecord) {
      // 更新现有记录
      await db.collection('user_warehouse').doc(existingRecord._id).update({
        data: {
          templateId: templateId,
          equipmentName: formData.name,
          images: [imageUrl],
          isActive: true,
          updateTime: now,
          activationTime: existingRecord.isActive ? existingRecord.activationTime : now
        }
      })
    } else {
      // 创建新记录
      await db.collection('user_warehouse').add({
        data: {
          openid: app.globalData.openid,
          templateId: templateId,
          equipmentName: formData.name,
          images: [imageUrl],
          attributes: [],
          notes: '',
          isActive: true,
          activationTime: now,
          createTime: now,
          updateTime: now
        }
      })
    }
    
    // 删除旧图片文件（如果存在）
    if (oldImageUrl && oldImageUrl.startsWith('cloud://')) {
      try {
        await wx.cloud.deleteFile({
          fileList: [oldImageUrl]
        })
        console.log('旧装备图片已删除:', oldImageUrl)
      } catch (deleteError) {
        console.warn('删除旧装备图片失败:', deleteError)
        // 删除失败不影响正常使用
      }
    }
    
    console.log('装备记录创建成功')
  },

  // 检查成就进度
  async checkAchievements() {
    try {
      console.log('开始调用成就检查云函数...')
      const result = await wx.cloud.callFunction({
        name: 'checkAchievements'
        // 云函数会自动获取openid，不需要手动传递
      })
      console.log('成就检查完成:', result)
      
      // 如果有新完成的成就，显示提示
      if (result.result && result.result.completedCount > 0) {
        wx.showToast({
          title: `恭喜完成${result.result.completedCount}个成就！`,
          icon: 'success',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('成就检查失败:', error)
      // 云函数调用失败时，不阻塞正常流程
      console.log('云函数调用失败，不影响正常上传流程')
    }
  }
})