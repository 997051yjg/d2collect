// pages/detail/detail.js
const app = getApp()
const { getRarityText } = require('../../utils/rarityMap.js')
const { getPropertyConfig } = require('../../utils/propertyMap.js')

Page({
  data: {
    // 核心数据
    equipment: null,      // 装备模板数据
    userEquipment: null,  // 用户仓库数据（具体的Roll值、图片）
    userInfo: null,       // 收藏者（主人）信息
    
    // 状态标识
    loading: true,
    isActivated: false,   // 是否已点亮
    isOwner: false,       // 【新增】当前查看者是否是装备主人
    
    // 辅助
    showCanvas: false,
    generatingImage: false,
    currentImageIndex: 0,
    scrollLeft: 0
  },

// pages/detail/detail.js - onLoad 函数

onLoad(options) {
    const equipmentId = options.id
    let ownerId = options.ownerId
    
    // 1. 尝试获取 openid
    const myOpenId = app.globalData.openid

    // 2. 如果我是通过普通点击进来的（没带 ownerId），默认看自己的
    if (!ownerId && myOpenId) {
      ownerId = myOpenId
    }

    // 3. 【新增】如果此时 ownerId 还是空的（比如刷新页面导致 globalData 丢失），
    // 再次尝试调用 app.wxLogin() 或等待逻辑 (视你 app.js 实现而定)
    // 这里做一个简单的兜底：如果没有 ownerId，就只加载模版，不加载用户数据
    
    this.setData({ equipmentId, ownerId })

    if (equipmentId) {
      this.loadData(equipmentId, ownerId)
    }
  },

  // 统一加载流程
  async loadData(equipmentId, ownerId) {
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const myOpenId = app.globalData.openid
      
      // 判断身份
      const isOwner = (ownerId === myOpenId)
      this.setData({ isOwner })

      // 1. 并行查询：装备模板 + 用户仓库数据
      // 注意：查询 user_warehouse 时，我们要查 ownerId 的数据
      const templatePromise = db.collection('equipment_templates').doc(equipmentId).get()
      
      let userPromise = Promise.resolve({ data: [] })
      
      if (ownerId) {
        userPromise = db.collection('user_warehouse')
          .where({
            // 【修正】将 _openid 改为 openid，与 upload.js 保存的字段一致
            openid: ownerId, 
            templateId: equipmentId
          })
          .get()
      }

      const [templateRes, userRes] = await Promise.all([templatePromise, userPromise])
      
      // 2. 处理装备模板
      const equipment = {
        ...templateRes.data,
        rarity: getRarityText(templateRes.data)
      }

      // 3. 处理用户数据
      let userEquipment = null
      let isActivated = false
      
      if (userRes.data.length > 0) {
        userEquipment = userRes.data[0]
        isActivated = true
        
        // 获取主人的个人信息
        this.loadOwnerInfo(ownerId)
      }

      // 4. 处理属性显示 (复用原有逻辑，增加容错)
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

  // 属性处理逻辑抽离
  processAttributes(attributes, userEquipment) {
    return attributes.map(attr => {
      const config = getPropertyConfig(attr.code)
      let displayText = ''
      let userValue = undefined

      // 如果已激活，尝试获取用户的 Roll 值
      if (userEquipment && userEquipment.attributes && userEquipment.attributes[attr.code] !== undefined) {
        userValue = userEquipment.attributes[attr.code]
      }

      // 生成显示文本
      const valToShow = userValue !== undefined ? userValue : attr.min
      displayText = config.format.replace('{0}', valToShow)
      if (attr.param) displayText = displayText.replace('{p}', attr.param)

      return {
        ...attr,
        label: config.label,
        displayColor: config.color,
        displayText,
        userValue // 存下来，wxml 里判断是否显示 "Roll" 标记
      }
    })
  },

  // 获取主人的信息
  async loadOwnerInfo(openid) {
    try {
      const db = wx.cloud.database()
      const { data } = await db.collection('users').where({ openid }).get()
      if (data.length > 0) {
        this.setData({ userInfo: data[0] })
      } else {
        // 默认信息
        this.setData({ userInfo: { nickName: '神秘奈非天', avatarUrl: '/images/default-avatar.png' } })
      }
    } catch (e) {
      console.error(e)
    }
  },

  // ==========================================
  // 分享核心配置 (Share Logic)
  // ==========================================
  
  // 1. 分享给好友 (卡片)
  onShareAppMessage() {
    const { equipment, isActivated, ownerId, userInfo } = this.data
    
    // 构造标题
    let title = `暗黑2图鉴：${equipment.name}`
    if (isActivated && userInfo) {
      title = `快来看${userInfo.nickName}的【${equipment.name}】！`
    }

    // 构造路径：必须带上 ownerId，否则别人点进来也是空的
    const path = `/pages/detail/detail?id=${equipment._id}&ownerId=${ownerId}`

    return {
      title: title,
      path: path,
      imageUrl: this.data.userEquipment?.images?.[0] || '/images/share-cover.jpg' // 优先用装备图，否则用默认图
    }
  },

  // 2. 分享到朋友圈
  onShareTimeline() {
    const { equipment, ownerId } = this.data
    return {
      title: `暗黑2装备展示：${equipment.name}`,
      query: `id=${equipment._id}&ownerId=${ownerId}`,
      imageUrl: this.data.userEquipment?.images?.[0]
    }
  },

  // 补充：回到首页
  goToHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
  
  // 补充：去上传（只有主人或者未激活时才显示）
  goToUpload() {
    // 这里由于是 TabBar 跳转，无法直接传参，沿用之前的 Cache 方案
    const { equipment } = this.data
    wx.setStorageSync('pendingUpload', {
      templateId: equipment._id,
      equipmentName: equipment.name
    })
    wx.switchTab({ url: '/pages/upload/upload' })
  },

// ==========================================
  // 海报生成系统 (Canvas 2D Version)
  // ==========================================

  async generateShareImage() {
    if (this.data.generatingImage) return
    
    const { equipment, isActivated, userEquipment } = this.data
    if (!isActivated || !userEquipment?.images?.[0]) {
      return wx.showToast({ title: '无图片可分享', icon: 'none' })
    }

    this.setData({ generatingImage: true })
    wx.showLoading({ title: '正在铭刻海报...', mask: true })

    try {
      // 1. 初始化 Canvas 2D 节点
      const { canvas, ctx, width, height, dpr } = await this.initCanvasNode()

      // 2. 准备资源 (并行下载)
      // 注意：Canvas 2D 需要使用 canvas.createImage() 创建图片对象，不能直接画路径
      
      // A. 装备图
      let equipImgUrl = userEquipment.images[0]
      // 如果是云存储路径，先换取临时链接
      if (equipImgUrl.startsWith('cloud://')) {
        equipImgUrl = await this.getTempPathFromCloud(equipImgUrl)
      }
      
      // B. 头像
      const avatarUrl = this.data.userInfo?.avatarUrl || '/images/4.png'
      
      // C. 二维码 (本地图片)
      const qrCodePath = '/images/3.png'

      // D. 加载所有图片对象
      const [equipImgObj, avatarImgObj, qrImgObj] = await Promise.all([
        this.loadImage2D(canvas, equipImgUrl),
        this.loadImage2D(canvas, avatarUrl),
        this.loadImage2D(canvas, qrCodePath)
      ])

      // 3. 开始绘制 (使用标准 Web Canvas API)
      
      // 清空画布
      ctx.clearRect(0, 0, width, height)

      // A. 绘制背景
      this.drawBackground2D(ctx, width, height)

      // B. 绘制装备大图
      this.drawEquipmentImage2D(ctx, equipImgObj, width)

      // C. 绘制信息卡片背景
      // 这里的坐标需要根据 dpr 换算吗？不需要，因为我们在 initCanvasNode 里 scale 了 ctx
      // 所以我们依然可以使用 750x1200 的逻辑坐标系写代码
      this.drawGlassCard2D(ctx, 40, 780, 670, 380)

      // D. 绘制文字信息
      this.drawEquipmentInfo2D(ctx, equipment)

      // E. 绘制用户胶囊
      this.drawUserCapsule2D(ctx, avatarImgObj, this.data.userInfo?.nickName)

      // F. 绘制二维码
      // 假设 qrImgObj 加载成功，如果没图则跳过
      if (qrImgObj) {
        ctx.drawImage(qrImgObj, 560, 1050, 100, 100)
      }
      
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = 'normal 20px sans-serif'
      ctx.fillText('长按识别', 575, 1180)

      // 4. 导出图片
      // Canvas 2D 需要稍微延时一下确保渲染缓冲区就绪
      setTimeout(() => {
        this.exportPostImage2D(canvas)
      }, 200)

    } catch (error) {
      console.error('海报生成失败:', error)
      wx.hideLoading()
      this.setData({ generatingImage: false })
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
    }
  },

  // ------------------------------------------
  // Canvas 2D 专用工具函数
  // ------------------------------------------

  // 初始化 Canvas 节点
  initCanvasNode() {
    return new Promise((resolve) => {
      const query = wx.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          // 处理高清屏 DPR
          const dpr = wx.getSystemInfoSync().pixelRatio
          
          // 设置画布内部尺寸 (物理像素)
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          
          // 缩放上下文，让我们后续可以用逻辑像素 (CSS像素) 绘图
          ctx.scale(dpr, dpr)

          // 这里的 width/height 返回逻辑像素，用于后续布局计算
          resolve({ canvas, ctx, width: res[0].width, height: res[0].height, dpr })
        })
    })
  },

  // 加载图片对象 (Canvas 2D 专用)
  loadImage2D(canvas, src) {
    return new Promise((resolve, reject) => {
      const img = canvas.createImage()
      img.onload = () => resolve(img)
      img.onerror = (e) => {
        console.warn('图片加载失败:', src, e)
        // 即使失败也 resolve null，避免 Promise.all 卡死
        resolve(null)
      }
      img.src = src
    })
  },

  // 获取云文件临时路径
  async getTempPathFromCloud(fileID) {
    try {
      const { tempFileURLs } = await wx.cloud.getTempFileURL({ fileList: [fileID] })
      return tempFileURLs[0].tempFileURL
    } catch (e) {
      return fileID // 失败降级
    }
  },

  // ------------------------------------------
  // 绘图逻辑 (Standard Web API)
  // ------------------------------------------

  drawBackground2D(ctx, w, h) {
    // 线性渐变
    const grd = ctx.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#1a1a1a')
    grd.addColorStop(1, '#000000')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, w, h)

    // 金色边框
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, w - 40, h - 40)
  },

  drawEquipmentImage2D(ctx, imgObj, canvasWidth) {
    if (!imgObj) return

    const size = 600
    const x = (canvasWidth - size) / 2
    const y = 100

    // 背景光晕
    const grd = ctx.createRadialGradient(375, 400, 50, 375, 400, 300)
    grd.addColorStop(0, 'rgba(212, 175, 55, 0.2)')
    grd.addColorStop(1, 'transparent')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, canvasWidth, 700)

    // 图片绘制 (圆角剪裁)
    ctx.save()
    this.roundRect2D(ctx, x, y, size, size, 20)
    ctx.clip()
    // drawImage 传入的是 Image 对象
    ctx.drawImage(imgObj, x, y, size, size)
    ctx.restore()

    // 金框
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 4
    this.roundRect2D(ctx, x, y, size, size, 20)
    ctx.stroke()
  },

  drawGlassCard2D(ctx, x, y, w, h) {
    ctx.save()
    ctx.fillStyle = 'rgba(30, 30, 30, 0.8)'
    
    // Canvas 2D 阴影写法
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 10
    
    this.roundRect2D(ctx, x, y, w, h, 24)
    ctx.fill()
    ctx.restore()

    // 顶部高光条
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 24, y)
    ctx.lineTo(x + w - 24, y)
    ctx.stroke()
  },

  drawEquipmentInfo2D(ctx, equipment) {
    const startX = 80
    let startY = 860

    // 1. 名称
    ctx.fillStyle = '#d4af37'
    // Canvas 2D 设置字体必须是完整字符串
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText(equipment.name, startX, startY)

    // 2. 类型
    startY += 60
    ctx.fillStyle = '#888888'
    ctx.font = 'normal 28px sans-serif'
    const subText = `${equipment.name_zh !== equipment.name ? equipment.name + ' · ' : ''}${equipment.type}`
    ctx.fillText(subText, startX, startY)

    // 3. 属性
    startY += 60
    ctx.fillStyle = '#cccccc'
    ctx.font = 'normal 26px sans-serif'
    
    const attrs = equipment.attributes || []
    let count = 0
    attrs.forEach(attr => {
      if (count >= 4) return
      
      // 复用之前的属性显示逻辑
      let text = attr.displayText
      // 如果没有预处理，这里简单降级处理
      if (!text) {
         const { getPropertyConfig } = require('../../utils/propertyMap.js')
         const config = getPropertyConfig(attr.code)
         if(attr.userValue !== undefined) {
             text = config.format.replace('{0}', attr.userValue)
         } else {
             text = `${config.label}: ${attr.min}`
         }
         if (attr.param) text = text.replace('{p}', attr.param)
      }

      ctx.fillText('• ' + text, startX, startY + (count * 40))
      count++
    })
    
    if (attrs.length > 4) {
      ctx.fillText('...', startX, startY + (count * 40))
    }
  },

  drawUserCapsule2D(ctx, avatarImgObj, nickName) {
    const x = 80
    const y = 1080
    const h = 80
    const w = 300

    // 胶囊背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    this.roundRect2D(ctx, x, y, w, h, h/2)
    ctx.fill()

    // 头像
    ctx.save()
    ctx.beginPath()
    ctx.arc(x + 40, y + 40, 30, 0, 2 * Math.PI)
    ctx.clip()
    if (avatarImgObj) {
      ctx.drawImage(avatarImgObj, x + 10, y + 10, 60, 60)
    }
    ctx.restore()

    // 边框
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x + 40, y + 40, 30, 0, 2 * Math.PI)
    ctx.stroke()

    // 名字
    ctx.fillStyle = '#ffffff'
    ctx.font = 'normal 28px sans-serif'
    ctx.fillText(nickName || '奈非天', x + 90, y + 50)
    
    // 标签
    ctx.fillStyle = '#d4af37'
    ctx.font = 'normal 20px sans-serif'
    ctx.fillText('发现者', x + 90, y + 25)
  },

  // 绘制圆角矩形路径 (标准)
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
  },

  // 导出图片
  exportPostImage2D(canvas) {
    wx.canvasToTempFilePath({
      canvas: canvas, // Canvas 2D 必须传 canvas 实例，而不是 canvas-id
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
      fail: (err) => {
        console.error('导出图片失败', err)
        wx.hideLoading()
        this.setData({ generatingImage: false })
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  }

})