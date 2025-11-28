// pages/detail/detail.js
const app = getApp()
const { getRarityText } = require('../../utils/rarityMap.js')
const { getPropertyConfig } = require('../../utils/propertyMap.js')

Page({
  data: {
    equipment: null,
    userEquipment: null,
    userInfo: null,
    loading: true,
    isActivated: false,
    isOwner: false,
    generatingImage: false,
    formattedTime: ''
  },

  onLoad(options) {
    const equipmentId = options.id
    let ownerId = options.ownerId
    const myOpenId = app.globalData.openid

    if (!ownerId && myOpenId) {
      ownerId = myOpenId
    }

    this.setData({ equipmentId, ownerId })

    if (equipmentId) {
      this.loadData(equipmentId, ownerId)
    }
  },

  async loadData(equipmentId, ownerId) {
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const myOpenId = app.globalData.openid
      
      const isOwner = (ownerId === myOpenId)
      this.setData({ isOwner })

      const templatePromise = db.collection('equipment_templates').doc(equipmentId).get()
      
      let userPromise = Promise.resolve({ data: [] })
      
      if (ownerId) {
        userPromise = db.collection('user_warehouse')
          .where({
            openid: ownerId, 
            templateId: equipmentId
          })
          .get()
      }

      const [templateRes, userRes] = await Promise.all([templatePromise, userPromise])
      
      const equipment = {
        ...templateRes.data,
        rarity: getRarityText(templateRes.data)
      }

      let userEquipment = null
      let isActivated = false
      
      if (userRes.data.length > 0) {
        userEquipment = userRes.data[0]
        isActivated = true
        
        const formattedTime = this.formatActivationTime(userEquipment.createTime)
        this.setData({ formattedTime })

        this.getCollectorInfo(ownerId).then(info => {
           this.setData({ userInfo: info })
        })
      }

      if (equipment.attributes) {
        equipment.attributes = this.processAttributes(equipment.attributes, userEquipment)
      }

      this.setData({
        equipment,
        userEquipment,
        isActivated,
        loading: false
      })

    } catch (error) {
      console.error('详情页加载失败', error)
      wx.showToast({ title: '数据加载异常', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  processAttributes(attributes, userEquipment) {
    return attributes.map(attr => {
      const config = getPropertyConfig(attr.code)
      let displayText = ''
      let userValue = undefined

      if (userEquipment && userEquipment.attributes && userEquipment.attributes[attr.code] !== undefined) {
        userValue = userEquipment.attributes[attr.code]
      }

      const valToShow = userValue !== undefined ? userValue : attr.min
      displayText = config.format.replace('{0}', valToShow)
      if (attr.param) displayText = displayText.replace('{p}', attr.param)

      return {
        ...attr,
        label: config.label,
        displayColor: config.color,
        displayText,
        userValue
      }
    })
  },

  async getCollectorInfo(openid) {
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('users').where({ openid }).get()
      if (data.length > 0) return data[0]
      return { nickName: '神秘奈非天', avatarUrl: '/images/default-avatar.png' }
    } catch (e) {
      return { nickName: '神秘奈非天', avatarUrl: '/images/default-avatar.png' }
    }
  },

  formatActivationTime(timeString) {
    if (!timeString) return '未知时间'
    const date = new Date(timeString)
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}`
  },

  viewImage(e) {
    if (!this.data.userEquipment?.images?.length) return
    const index = e.currentTarget.dataset.index || 0
    const urls = this.data.userEquipment.images
    wx.previewImage({ urls, current: urls[index] })
  },

  goToHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goToUpload() {
    const { equipment } = this.data
    wx.setStorageSync('pendingUpload', {
      templateId: equipment._id,
      equipmentName: equipment.name
    })
    wx.switchTab({ url: '/pages/upload/upload' })
  },

  getEquipmentIcon(type) {
    return '/images/1.png'
  },

  onShareAppMessage() {
    const { equipment, isActivated, ownerId, userInfo } = this.data
    let title = `暗黑2图鉴：${equipment.name}`
    if (isActivated && userInfo) {
      title = `${userInfo.nickName} 的【${equipment.name}】`
    }
    return {
      title,
      path: `/pages/detail/detail?id=${equipment._id}&ownerId=${ownerId}`,
      imageUrl: this.data.userEquipment?.images?.[0] || '/images/share-cover.jpg'
    }
  },

  onShareTimeline() {
    const { equipment, ownerId } = this.data
    return {
      title: `暗黑2装备展示：${equipment.name}`,
      query: `id=${equipment._id}&ownerId=${ownerId}`,
      imageUrl: this.data.userEquipment?.images?.[0]
    }
  },

// ==========================================
  // 海报生成系统 (Unified Card Version)
  // ==========================================

  async generateShareImage() {
    if (this.data.generatingImage) return
    
    const { equipment, isActivated, userEquipment, userInfo } = this.data
    if (!isActivated || !userEquipment?.images?.[0]) {
      return wx.showToast({ title: '无图片可分享', icon: 'none' })
    }

    this.setData({ generatingImage: true })
    wx.showLoading({ title: '铭刻海报...', mask: true })

    try {
      const { canvas, ctx, width, height } = await this.initCanvasNode()

      // 1. 准备资源
      const equipSource = userEquipment.images[0]
      const avatarSource = userInfo?.avatarUrl || '//images/default-avatar.png'
      const qrCodeSource = '//images/qrcode-placeholder.png' 
      const iconSource = equipment.image || '//images/1.png'

      const [equipPath, avatarPath, qrPath, iconPath] = await Promise.all([
        this.downloadToLocal(equipSource, 'equipment'),
        this.downloadToLocal(avatarSource, 'avatar'),
        this.downloadToLocal(qrCodeSource, 'qrcode'),
        this.downloadToLocal(iconSource, 'icon')
      ])

      const [equipImgObj, avatarImgObj, qrImgObj, iconImgObj] = await Promise.all([
        this.createCanvasImage(canvas, equipPath),
        this.createCanvasImage(canvas, avatarPath),
        this.createCanvasImage(canvas, qrPath),
        this.createCanvasImage(canvas, iconPath)
      ])

      wx.hideLoading()
      wx.showLoading({ title: '正在绘制...', mask: true })

      // 2. 开始绘制
      ctx.clearRect(0, 0, width, height)

      // A. 背景 (纯净暗黑)
      this.drawBackground2D(ctx, width, height)

      // B. 装备大图 (稍微上移，给大卡片留空间)
      if (equipImgObj) {
        this.drawMainImage2D(ctx, equipImgObj, width, 700) 
      }

      // C. 统一大卡片 (包含信息、发现者、二维码)
      // 从 Y=760 开始，一直到底部留白处
      const cardY = 760
      const cardH = 420 // 足够高以容纳所有内容
      this.drawUnifiedPanel2D(ctx, equipment, iconImgObj, avatarImgObj, qrImgObj, userInfo?.nickName, 40, cardY, width - 80, cardH)

      // D. 底部水印 (移到大卡片下方)
      this.drawWatermark2D(ctx, 40, cardY + cardH + 50)

      // 3. 导出
      setTimeout(() => {
        this.exportPostImage2D(canvas)
      }, 500)

    } catch (error) {
      console.error('海报生成失败:', error)
      wx.hideLoading()
      this.setData({ generatingImage: false })
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    }
  },

  // ------------------------------------------
  // 绘图逻辑 (Drawing Logic)
  // ------------------------------------------

  drawBackground2D(ctx, w, h) {
    const grd = ctx.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#1a1a1a')
    grd.addColorStop(1, '#000000')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)
  },

  drawMainImage2D(ctx, imgObj, canvasWidth, targetHeight) {
    const boxSize = 640
    const boxX = (canvasWidth - boxSize) / 2
    const boxY = 60 // 稍微上移

    // 底座光晕
    const centerX = canvasWidth / 2
    const centerY = boxY + boxSize / 2
    const grd = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 350)
    grd.addColorStop(0, 'rgba(212, 175, 55, 0.15)')
    grd.addColorStop(1, 'transparent')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, canvasWidth, targetHeight + 50)

    // 绘制图片 (Aspect Fit)
    const imgW = imgObj.width
    const imgH = imgObj.height
    const scale = Math.min(boxSize / imgW, boxSize / imgH)
    const drawW = imgW * scale
    const drawH = imgH * scale
    const offsetX = (boxSize - drawW) / 2
    const offsetY = (boxSize - drawH) / 2

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 20
    ctx.drawImage(imgObj, boxX + offsetX, boxY + offsetY, drawW, drawH)
    ctx.restore()
  },

  // 【核心新函数】绘制统一大面板
  drawUnifiedPanel2D(ctx, equipment, iconImg, avatarImg, qrImg, nickName, x, y, w, h) {
    // 1. 大卡片背景
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)' // 统一的浅色玻璃
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    this.roundRect2D(ctx, x, y, w, h, 24)
    ctx.fill()
    ctx.restore()

    // 边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    this.roundRect2D(ctx, x, y, w, h, 24)
    ctx.stroke()

    // --- 上半部分：装备信息 ---
    let textOffsetX = 40
    if (iconImg) {
      const iconSize = 120
      ctx.drawImage(iconImg, x + 40, y + 40, iconSize, iconSize) // 图标略大
      textOffsetX = 190
    }

    // 装备名称
    let titleColor = '#d4af37'
    let rarityColor = '#d4af37'
    let rarityBg = 'rgba(212, 175, 55, 0.15)'
    let rarityBorder = 'rgba(212, 175, 55, 0.4)'

    if (equipment.rarity === '套装') {
      titleColor = '#32cd32'
      rarityColor = '#32cd32'
      rarityBg = 'rgba(50, 205, 50, 0.15)'
      rarityBorder = 'rgba(50, 205, 50, 0.4)'
    } else if (equipment.rarity === '符文之语') {
      titleColor = '#ffa500'
      rarityColor = '#ffa500'
      rarityBg = 'rgba(255, 165, 0, 0.15)'
      rarityBorder = 'rgba(255, 165, 0, 0.4)'
    } else {
      titleColor = '#ffffff'
    }

    ctx.fillStyle = titleColor
    ctx.font = 'bold 44px "Times New Roman", serif'
    ctx.textAlign = 'left'
    ctx.fillText(equipment.name_zh, x + textOffsetX, y + 80)

    // 品质胶囊
    const pillText = equipment.rarity
    ctx.font = 'bold 22px sans-serif'
    const textMetrics = ctx.measureText(pillText)
    const pillW = textMetrics.width + 40
    const pillH = 40
    const pillX = x + textOffsetX
    const pillY = y + 110

    ctx.save()
    ctx.fillStyle = rarityBg
    ctx.strokeStyle = rarityBorder
    ctx.lineWidth = 1
    this.roundRect2D(ctx, pillX, pillY, pillW, pillH, pillH/2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = rarityColor
    ctx.textAlign = 'center'
    ctx.fillText(pillText, pillX + pillW/2, pillY + 28)
    ctx.restore()

    // --- 分割线 ---
    const dividerY = y + 200
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.moveTo(x + 40, dividerY)
    ctx.lineTo(x + w - 40, dividerY)
    ctx.stroke()

    // --- 下半部分：发现者 & 二维码 ---
    const bottomContentY = dividerY + 40
    
    // 发现者头像
    const avatarSize = 100
    ctx.save()
    ctx.beginPath()
    ctx.arc(x + 40 + avatarSize/2, bottomContentY + avatarSize/2, avatarSize/2, 0, 2 * Math.PI)
    ctx.clip()
    if (avatarImg) ctx.drawImage(avatarImg, x + 40, bottomContentY, avatarSize, avatarSize)
    ctx.restore()
    // 头像金框
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x + 40 + avatarSize/2, bottomContentY + avatarSize/2, avatarSize/2, 0, 2 * Math.PI)
    ctx.stroke()

    // 发现者名字
    ctx.textAlign = 'left'
    ctx.fillStyle = '#d4af37'
    ctx.font = 'normal 24px sans-serif'
    ctx.fillText('发现者', x + 160, bottomContentY + 30)
    
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText(nickName || '奈非天', x + 160, bottomContentY + 75)

    // 二维码 (右对齐)
    if (qrImg) {
      const qrSize = 140
      const qrX = x + w - 40 - qrSize
      const qrY = bottomContentY - 20
      
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
      
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = 'normal 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('长按识别', qrX + qrSize/2, qrY + qrSize + 30)
    }
  },

  // 独立水印绘制
  drawWatermark2D(ctx, x, y) {
    ctx.save()
    ctx.fillStyle = 'rgba(212, 175, 55, 0.5)' // 暗金半透明
    ctx.font = 'italic bold 28px "Times New Roman", serif' 
    ctx.textAlign = 'left'
    ctx.fillText('Diablo II Resurrected', x, y)
    
    // 右侧加个小装饰线
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    const textWidth = ctx.measureText('Diablo II Resurrected').width
    ctx.moveTo(x + textWidth + 20, y - 10)
    ctx.lineTo(x + textWidth + 100, y - 10)
    ctx.lineTo(x + textWidth + 100, y - 25)
    ctx.stroke()
    
    ctx.restore()
  },

  // ------------------------------------------
  // 工具函数 (Utils)
  // ------------------------------------------

  initCanvasNode() {
    return new Promise((resolve) => {
      const query = wx.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) throw new Error('Canvas节点未找到')
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
          const dpr = info.pixelRatio
          
          const designWidth = 750
          const designHeight = 1334
          
          canvas.width = designWidth * dpr
          canvas.height = designHeight * dpr
          ctx.scale(dpr, dpr)

          resolve({ canvas, ctx, width: designWidth, height: designHeight })
        })
    })
  },

  async downloadToLocal(path, type) {
    if (!path) return null
    try {
      if (path.startsWith('cloud://')) {
        const res = await wx.cloud.downloadFile({ fileID: path })
        return res.tempFilePath
      }
      if (path.startsWith('http')) {
        return new Promise(resolve => {
          wx.downloadFile({
            url: path,
            success: res => resolve(res.statusCode === 200 ? res.tempFilePath : null),
            fail: () => resolve(null)
          })
        })
      }
      return new Promise(resolve => {
        wx.getImageInfo({
          src: path,
          success: res => resolve(res.path),
          fail: (err) => {
            console.error(`本地图片失败 [${type}]:`, path, err)
            resolve(null)
          }
        })
      })
    } catch (e) {
      console.error(`资源异常 [${type}]:`, e)
      return null
    }
  },

  createCanvasImage(canvas, src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null)
      const img = canvas.createImage()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
  },

  exportPostImage2D(canvas) {
    wx.canvasToTempFilePath({
      canvas: canvas,
      fileType: 'jpg',
      quality: 0.9,
      success: (res) => {
        wx.hideLoading()
        this.setData({ generatingImage: false })
        wx.previewImage({
          current: res.tempFilePath,
          urls: [res.tempFilePath]
        })
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ generatingImage: false })
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  },

  roundRect2D(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
})