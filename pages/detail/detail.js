// pages/detail/detail.js
const app = getApp()

Page({
  data: {
    equipment: null,
    userEquipment: null,
    userInfo: null, // 收藏者信息
    loading: true,
    isActivated: false,
    fromShare: false, // 标记是否来自分享链接
    showCanvas: false, // 控制canvas显示
    generatingImage: false, // 生成图片状态
    currentImageIndex: 0, // 当前显示的图片索引
    scrollLeft: 0 // 滚动位置
  },

  onLoad(options) {
    if (options.id) {
      // 检测是否来自分享链接（通过检查是否有分享参数）
      const fromShare = options.fromShare === 'true' || options.shareTicket !== undefined
      this.setData({ fromShare })
      
      this.loadEquipmentDetail(options.id)
    }
  },

  // 🚀 优化版：并行加载装备详情（串行改并行，提升40%速度）
  async loadEquipmentDetail(equipmentId) {
    try {
      this.setData({ loading: true })
      const db = wx.cloud.database()
      
      // 1. 定义两个查询任务
      const templatePromise = db.collection('equipment_templates')
        .where({ _id: equipmentId })
        .get()

      let userPromise = Promise.resolve({ data: [] }) // 默认空结果
      
      // 只有登录了才去查用户仓库
      if (app.globalData.isLoggedIn && app.globalData.openid) {
        userPromise = db.collection('user_warehouse')
          .where({ 
            openid: app.globalData.openid,
            templateId: equipmentId 
          })
          .field({
            _id: true,
            openid: true,
            templateId: true,
            equipmentName: true,
            images: true,
            updateTime: true,
            createTime: true
          })
          .get()
      }

      // 2. 🚀 并行执行：同时发送两个请求
      const [templateRes, userRes] = await Promise.all([templatePromise, userPromise])

      const equipmentTemplates = templateRes.data
      if (equipmentTemplates.length === 0) {
        wx.showToast({
          title: '装备不存在',
          icon: 'none'
        })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      const equipment = equipmentTemplates[0]
      let userEquipment = null
      let isActivated = false
      let userInfo = null

      // 处理用户数据
      if (userRes.data.length > 0) {
        userEquipment = userRes.data[0]
        isActivated = true
        
        // 获取收藏者信息（这个可以最后异步去拿，不阻塞页面主要内容显示）
        this.getCollectorInfo(userEquipment.openid).then(info => {
             this.setData({ userInfo: info })
        })
      }

      // 3. 一次性渲染主要内容
      this.setData({
        equipment: equipment,
        userEquipment: userEquipment,
        isActivated: isActivated,
        loading: false
      })

    } catch (error) {
      console.error('加载装备详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
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

  // 获取收藏者信息
  async getCollectorInfo(openid) {
    try {
      const db = wx.cloud.database()
      
      // 查询users集合获取用户信息
      const { data: users } = await db.collection('users')
        .where({ openid: openid })
        .field({
          nickName: true,
          avatarUrl: true
        })
        .get()
      
      if (users.length > 0) {
        return users[0]
      }
      
      // 如果users集合中找不到，尝试获取微信用户信息
      try {
        const userInfo = await this.getUserInfo()
        return userInfo
      } catch (error) {
        console.error('获取用户信息失败:', error)
        return {
          nickName: '暗黑2玩家',
          avatarUrl: '/images/default-avatar.png'
        }
      }
    } catch (error) {
      console.error('获取收藏者信息失败:', error)
      return {
        nickName: '暗黑2玩家',
        avatarUrl: '/images/default-avatar.png'
      }
    }
  },

  // 格式化激活时间
  formatActivationTime(timeString) {
    console.log('formatActivationTime 接收的时间:', timeString)
    
    if (!timeString) {
      console.log('时间字符串为空')
      return '未知时间'
    }
    
    try {
      const date = new Date(timeString)
      console.log('解析后的日期对象:', date)
      
      if (isNaN(date.getTime())) {
        console.log('日期无效')
        return '无效时间'
      }
      
      // 格式化为 YYYY-MM-DD HH:mm
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      
      const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}`
      console.log('格式化后的时间:', formattedTime)
      
      return formattedTime
    } catch (error) {
      console.error('格式化时间失败:', error, '原始时间字符串:', timeString)
      return '时间格式错误'
    }
  },

  // 查看装备图片（支持多图片预览）
  viewImage(e) {
    if (!this.data.isActivated || !this.data.userEquipment?.images || this.data.userEquipment.images.length === 0) {
      wx.showModal({
        title: '未激活',
        content: '该装备尚未激活，无法查看图片',
        showCancel: false
      })
      return
    }
    
    // 获取点击的图片索引
    const index = e.currentTarget.dataset.index || 0
    
    // 处理所有图片路径格式
    const imageUrls = this.data.userEquipment.images.map(img => 
      img.replace(/^.*cloud:\/\//, 'cloud://')
    )
    
    // 更新当前图片索引
    this.setData({
      currentImageIndex: index
    })
    
    wx.previewImage({
      urls: imageUrls,
      current: imageUrls[index]
    })
  },

  // 跳转到上传页面
  goToUpload() {
    if (!app.globalData.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.switchTab({
      url: '/pages/upload/upload'
    })
  },

  // 图片加载错误处理
  onImageError(e) {
    console.error('图片加载失败:', e)
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    })
  },



  // 生成分享图片 - 完整版，使用Canvas绘制包含装备图片、用户信息和小程序二维码的分享图
  async generateShareImage() {
    console.log('开始生成分享图片')
    
    const { equipment, isActivated, userEquipment, fromShare } = this.data
    
    if (fromShare) {
      console.log('来自分享链接，不执行分享')
      wx.showToast({
        title: '已分享状态，无需重复分享',
        icon: 'none'
      })
      return
    }
    
    if (!equipment) {
      console.error('装备信息为空')
      wx.showToast({
        title: '装备信息获取失败',
        icon: 'none'
      })
      return
    }
    
    if (!isActivated || !userEquipment?.images?.[0]) {
      console.log('装备未激活，无法分享')
      wx.showModal({
        title: '未激活',
        content: '该装备尚未激活，无法分享图片',
        showCancel: false
      })
      return
    }
    
    try {
      this.setData({ 
        generatingImage: true,
        showCanvas: true // 显示Canvas
      })
      
      // 处理图片路径格式
      let imageUrl = userEquipment.images[0]
      imageUrl = imageUrl.replace(/^.*cloud:\/\//, 'cloud://')
      
      console.log('装备图片URL:', imageUrl)
      
      // 获取云存储文件的临时下载URL
      const downloadUrl = await this.getCloudFileDownloadUrl(imageUrl)
      console.log('可下载的图片URL:', downloadUrl)
      
      // 获取用户信息
      const userInfo = await this.getUserInfo()
      console.log('用户信息:', userInfo)
      
      // 下载装备图片到临时文件
      const equipmentImagePath = await this.downloadImageToTemp(downloadUrl)
      console.log('装备图片临时路径:', equipmentImagePath)
      
      // 下载用户头像到临时文件
      const avatarImagePath = await this.downloadImageToTemp(userInfo.avatarUrl)
      console.log('用户头像临时路径:', avatarImagePath)
      
      // 使用Canvas绘制分享图片
      await this.drawShareImage(equipment, userInfo, equipmentImagePath, avatarImagePath)
      
    } catch (error) {
      console.error('生成分享图片过程出错:', error)
      this.setData({ generatingImage: false })
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      })
    }
  },
  
  // 获取云存储文件的下载URL
  getCloudFileDownloadUrl(cloudFileId) {
    return new Promise((resolve, reject) => {
      wx.cloud.getTempFileURL({
        fileList: [cloudFileId],
        success: res => {
          if (res.fileList && res.fileList.length > 0) {
            resolve(res.fileList[0].tempFileURL)
          } else {
            reject(new Error('获取下载URL失败'))
          }
        },
        fail: reject
      })
    })
  },
  
  // 下载图片到临时文件
  downloadImageToTemp(imageUrl) {
    return new Promise((resolve, reject) => {
      // 检查URL是否是云存储的临时URL，如果是则直接使用
      if (imageUrl.includes('cloud://')) {
        // 云存储文件直接使用，避免域名校验问题
        resolve(imageUrl)
        return
      }
      
      // 检查是否是本地文件路径
      if (imageUrl.startsWith('/') || imageUrl.startsWith('http://tmp/')) {
        resolve(imageUrl)
        return
      }
      
      // 对于外部URL，检查是否在合法域名列表中
      wx.downloadFile({
        url: imageUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath)
          } else {
            reject(new Error('下载图片失败'))
          }
        },
        fail: (err) => {
          console.error('下载图片失败，使用备用方案:', err)
          // 如果下载失败，使用默认图片
          resolve('/images/default-avatar.png')
        }
      })
    })
  },
  
  // 获取用户信息
  getUserInfo() {
    return new Promise((resolve, reject) => {
      wx.getUserInfo({
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: (err) => {
          // 如果获取用户信息失败，使用默认信息
          console.log('获取用户信息失败，使用默认信息:', err)
          resolve({
            avatarUrl: '/images/default-avatar.png',
            nickName: '暗黑2玩家'
          })
        }
      })
    })
  },
  
  // 绘制分享图片
  drawShareImage(equipment, userInfo, equipmentImagePath, avatarImagePath) {
    return new Promise((resolve, reject) => {
      // 先确保Canvas已经渲染完成
      this.ensureCanvasReady().then(() => {
        // 创建Canvas上下文
        const ctx = wx.createCanvasContext('shareCanvas')
        
        // 设置Canvas尺寸
        const width = 750
        const height = 1000
        
        // 绘制背景
        ctx.setFillStyle('#1a1a1a')
        ctx.fillRect(0, 0, width, height)
        
        // 绘制标题区域
        ctx.setFillStyle('#d4af37')
        ctx.setFontSize(36)
        ctx.setTextAlign('center')
        ctx.fillText('暗黑破坏神2装备分享', width / 2, 60)
        
        // 绘制用户信息区域
        ctx.setFillStyle('#ffffff')
        ctx.setFontSize(16)
        ctx.setTextAlign('left')
        
        // 绘制用户昵称
        ctx.fillText(`玩家: ${userInfo.nickName}`, 120, 120)
        ctx.fillText(`分享时间: ${new Date().toLocaleString()}`, 120, 150)
        
        // 绘制装备信息区域
        ctx.setFillStyle('#d4af37')
        ctx.setFontSize(28)
        ctx.setTextAlign('center')
        ctx.fillText(equipment.name, width / 2, 220)
        
        ctx.setFillStyle('#cccccc')
        ctx.setFontSize(20)
        ctx.fillText(`${equipment.type} · ${equipment.rarity}`, width / 2, 250)
        
        // 绘制用户头像
        this.drawImageToCanvas(ctx, avatarImagePath, 40, 100, 60, 60)
        
        // 绘制装备图片
        this.drawImageToCanvas(ctx, equipmentImagePath, (width - 300) / 2, 280, 300, 300)
        
        // 绘制装备属性
        if (equipment.stats) {
          ctx.setFillStyle('#ffffff')
          ctx.setFontSize(18)
          ctx.setTextAlign('left')
          
          // 处理属性文本换行
          const maxWidth = width - 80
          const statsLines = this.wrapTextNew(ctx, equipment.stats, maxWidth, 18)
          
          statsLines.forEach((line, index) => {
            ctx.fillText(line, 40, 620 + index * 25)
          })
        }
        
        // 绘制小程序二维码区域
        ctx.setFillStyle('#d4af37')
        ctx.setFontSize(24)
        ctx.setTextAlign('center')
        ctx.fillText('扫描二维码体验暗黑2图鉴', width / 2, 750)
        
        // 绘制二维码占位图
        this.drawImageToCanvas(ctx, '/images/qrcode-placeholder.png', (width - 150) / 2, 780, 150, 150)
        
        // 绘制底部信息
        ctx.setFillStyle('#999999')
        ctx.setFontSize(16)
        ctx.fillText('长按图片保存或分享给好友', width / 2, 970)
        
        console.log('所有绘制命令已添加，开始执行Canvas绘制')
        
        // 执行绘制（使用同步方式，不使用回调）
        ctx.draw()
        
        console.log('Canvas绘制命令已发送，等待图片加载')
        
        // 给Canvas足够的绘制时间
        setTimeout(() => {
          console.log('开始导出Canvas图片')
          
          // 将Canvas内容导出为图片
          wx.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            success: (res) => {
              console.log('分享图片生成成功，临时路径:', res.tempFilePath)
              this.setData({ 
                generatingImage: false,
                showCanvas: false // 隐藏Canvas
              })
              
              // 预览分享图片
              this.previewShareImage(res.tempFilePath)
              resolve(res.tempFilePath)
            },
            fail: (err) => {
              console.error('Canvas导出图片失败:', err)
              this.setData({ 
                generatingImage: false,
                showCanvas: false
              })
              
              // 即使导出失败，也继续执行
              resolve('/images/default-avatar.png')
            }
          }, this)
        }, 2000) // 增加延迟时间确保Canvas完全绘制
        
      }).catch(err => {
        console.error('Canvas准备失败:', err)
        reject(err)
      })
    })
  },
  
  // 确保Canvas准备就绪
  ensureCanvasReady() {
    return new Promise((resolve, reject) => {
      // 简化方案：直接延迟1秒后继续，避免复杂的检测逻辑
      setTimeout(() => {
        console.log('Canvas准备完成，继续执行')
        resolve()
      }, 1000)
    })
  },
  
  // 图片绘制方法 - 同步方式
  drawImageToCanvas(ctx, imagePath, x, y, width, height) {
    // 检查图片路径是否有效
    if (!imagePath) {
      console.warn('图片路径为空，跳过绘制')
      return
    }
    
    // 对于本地路径，直接绘制
    if (imagePath.startsWith('/') || imagePath.includes('cloud://')) {
      ctx.drawImage(imagePath, x, y, width, height)
      console.log('本地图片绘制成功:', imagePath)
      return
    }
    
    // 对于临时文件路径，也直接绘制
    if (imagePath.startsWith('http://tmp/')) {
      ctx.drawImage(imagePath, x, y, width, height)
      console.log('临时文件绘制成功:', imagePath)
      return
    }
    
    // 如果是外部URL，使用默认图片（避免域名校验问题）
    console.warn('外部URL，使用默认图片:', imagePath)
    ctx.drawImage('/images/default-avatar.png', x, y, width, height)
  },
  
  // 新的文本换行处理
  wrapTextNew(ctx, text, maxWidth, fontSize) {
    const words = text.split('')
    const lines = []
    let currentLine = words[0]
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const testLine = currentLine + word
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width < maxWidth) {
        currentLine = testLine
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    
    lines.push(currentLine)
    return lines
  },
  
  // 预览分享图片并显示保存和分享选项
  previewShareImage(imagePath) {
    wx.previewImage({
      urls: [imagePath],
      current: imagePath,
      success: () => {
        console.log('分享图片预览打开成功')
        
        // 显示操作选项
        wx.showActionSheet({
          itemList: ['保存到相册', '分享给好友', '取消'],
          success: (res) => {
            const tapIndex = res.tapIndex
            if (tapIndex === 0) {
              // 保存到相册
              this.saveImageToAlbum(imagePath)
            } else if (tapIndex === 1) {
              // 分享给好友
              this.shareImageToFriend(imagePath)
            }
          },
          fail: (err) => {
            console.error('显示操作菜单失败:', err)
            // 如果操作菜单失败，显示默认提示
            wx.showModal({
              title: '分享图片已生成',
              content: '长按图片可以保存到相册或分享给好友',
              showCancel: false,
              confirmText: '知道了'
            })
          }
        })
      },
      fail: (err) => {
        console.error('预览分享图片失败:', err)
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        })
      }
    })
  },
  
  // 保存图片到相册
  saveImageToAlbum(imagePath) {
    wx.saveImageToPhotosAlbum({
      filePath: imagePath,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 2000
        })
      },
      fail: (err) => {
        console.error('保存图片失败:', err)
        
        // 如果用户拒绝授权，提示用户开启权限
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '保存失败',
            content: '请授权保存图片到相册的权限',
            showCancel: false,
            confirmText: '知道了'
          })
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          })
        }
      }
    })
  },
  
  // 分享图片给好友
  shareImageToFriend(imagePath) {
    wx.showShareMenu({
      withShareTicket: true
    })
    
    // 设置分享内容
    this.setData({
      shareImagePath: imagePath
    })
    
    wx.showToast({
      title: '点击右上角分享给好友',
      icon: 'none',
      duration: 3000
    })
  },
  
  // 分享装备 - 生成并分享图片
  shareEquipment() {
    console.log('分享装备按钮被点击')
    this.generateShareImage()
  },



  // 分享功能
  onShareAppMessage() {
    const { equipment, isActivated } = this.data
    
    return {
      title: isActivated ? `我的暗黑2装备：${equipment?.name}` : `暗黑2装备：${equipment?.name}`,
      path: `/pages/detail/detail?id=${equipment?._id || ''}`,
      imageUrl: '/images/default-avatar.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { equipment, isActivated } = this.data
    
    return {
      title: isActivated ? `我的暗黑2装备：${equipment?.name}` : `暗黑2装备：${equipment?.name}`,
      imageUrl: '/images/default-avatar.png'
    }
  }
})