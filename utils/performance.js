// utils/performance.js - 性能监控和优化工具

/**
 * 性能监控类
 */
class PerformanceMonitor {
  constructor() {
    this.timers = new Map()
    this.metrics = new Map()
    this.enabled = true // 默认开启性能监控
  }

  /**
   * 开始计时
   * @param {string} name - 计时器名称
   */
  startTimer(name) {
    if (!this.enabled) return
    
    if (this.timers.has(name)) {
      console.warn(`计时器 ${name} 已存在，将重新开始计时`)
    }
    
    this.timers.set(name, {
      startTime: Date.now(),
      endTime: null,
      duration: null
    })
  }

  /**
   * 结束计时
   * @param {string} name - 计时器名称
   * @returns {number} 耗时（毫秒）
   */
  endTimer(name) {
    if (!this.enabled) return null
    
    const timer = this.timers.get(name)
    if (!timer) {
      console.warn(`计时器 ${name} 不存在`)
      return null
    }

    timer.endTime = Date.now()
    timer.duration = timer.endTime - timer.startTime
    
    // 记录到指标中
    this.recordMetric(name, timer.duration)
    
    // 开发环境下输出性能日志
    if (wx.getSystemInfoSync().platform === 'devtools') {
      console.log(`[性能监控] ${name}: ${timer.duration}ms`)
    }
    
    return timer.duration
  }

  /**
   * 记录性能指标
   * @param {string} name - 指标名称
   * @param {number} value - 指标值
   */
  recordMetric(name, value) {
    if (!this.enabled) return
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const metrics = this.metrics.get(name)
    metrics.push(value)
    
    // 保持最近100条记录
    if (metrics.length > 100) {
      metrics.shift()
    }
  }

  /**
   * 获取性能指标统计
   * @param {string} name - 指标名称
   * @returns {Object} 统计信息
   */
  getMetricStats(name) {
    const metrics = this.metrics.get(name) || []
    if (metrics.length === 0) {
      return null
    }

    const sorted = [...metrics].sort((a, b) => a - b)
    const sum = sorted.reduce((a, b) => a + b, 0)
    const avg = sum / sorted.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]

    return {
      count: sorted.length,
      average: Math.round(avg),
      median: Math.round(median),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: Math.round(sorted[0]),
      max: Math.round(sorted[sorted.length - 1])
    }
  }

  /**
   * 生成性能报告
   * @returns {Object} 性能报告
   */
  generateReport() {
    const report = {}
    
    for (const [name, metrics] of this.metrics) {
      report[name] = this.getMetricStats(name)
    }
    
    return report
  }

  /**
   * 清空所有指标
   */
  clear() {
    this.timers.clear()
    this.metrics.clear()
  }

  /**
   * 启用/禁用性能监控
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.enabled = enabled
  }
}

/**
 * 性能优化工具类
 */
class PerformanceOptimizer {
  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @param {boolean} immediate - 是否立即执行
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, delay = 300, immediate = false) {
    let timer = null
    
    return function (...args) {
      if (timer) {
        clearTimeout(timer)
      }
      
      if (immediate && !timer) {
        func.apply(this, args)
      }
      
      timer = setTimeout(() => {
        if (!immediate) {
          func.apply(this, args)
        }
        timer = null
      }, delay)
    }
  }

  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} delay - 节流时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  static throttle(func, delay = 300) {
    let lastTime = 0
    let timer = null
    
    return function (...args) {
      const currentTime = Date.now()
      
      if (currentTime - lastTime < delay) {
        if (timer) {
          clearTimeout(timer)
        }
        
        timer = setTimeout(() => {
          lastTime = currentTime
          func.apply(this, args)
        }, delay - (currentTime - lastTime))
      } else {
        lastTime = currentTime
        func.apply(this, args)
      }
    }
  }

  /**
   * 批量更新数据（减少setData调用）
   * @param {Object} page - 页面实例
   * @param {Object} updates - 要更新的数据
   * @param {number} delay - 延迟时间（毫秒）
   */
  static batchUpdate(page, updates, delay = 0) {
    if (delay <= 0) {
      page.setData(updates)
      return
    }
    
    if (page._batchUpdateTimer) {
      clearTimeout(page._batchUpdateTimer)
    }
    
    page._batchUpdateData = {
      ...(page._batchUpdateData || {}),
      ...updates
    }
    
    page._batchUpdateTimer = setTimeout(() => {
      if (page._batchUpdateData) {
        page.setData(page._batchUpdateData)
        page._batchUpdateData = null
      }
    }, delay)
  }

  /**
   * 图片懒加载
   * @param {Object} page - 页面实例
   * @param {string} selector - 图片选择器
   * @param {Object} options - 配置选项
   */
  static lazyLoadImages(page, selector, options = {}) {
    const {
      rootMargin = '50px',
      threshold = 0.1,
      placeholder = '/images/placeholder.png'
    } = options
    
    const query = wx.createIntersectionObserver(page, {
      thresholds: [threshold],
      observeAll: true
    })
    
    query.relativeToViewport({ bottom: rootMargin })
      .observe(selector, (res) => {
        if (res.intersectionRatio > 0) {
          const dataset = res.dataset || {}
          const src = dataset.src || res.id
          
          if (src && src !== placeholder) {
            // 标记图片已加载
            const key = dataset.key || `images[${dataset.index}]`
            page.setData({
              [key]: {
                ...page.data[key],
                loaded: true
              }
            })
          }
        }
      })
  }

  /**
   * 内存管理：清理过期的缓存
   */
  static cleanupMemory() {
    const now = Date.now()
    const cacheKeys = Object.keys(wx.getStorageInfoSync().keys)
    
    cacheKeys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const cached = wx.getStorageSync(key)
          if (cached && cached.timestamp) {
            // 超过1小时的缓存清理
            if (now - cached.timestamp > 60 * 60 * 1000) {
              wx.removeStorageSync(key)
            }
          }
        } catch (error) {
          // 忽略错误
        }
      }
    })
  }

  /**
   * 优化图片大小
   * @param {string} filePath - 图片路径
   * @param {number} maxWidth - 最大宽度
   * @param {number} maxHeight - 最大高度
   * @param {number} quality - 质量（0-1）
   * @returns {Promise<string>} 优化后的图片路径
   */
  static optimizeImage(filePath, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success: (info) => {
          const { width, height } = info
          
          // 计算缩放比例
          const scale = Math.min(maxWidth / width, maxHeight / height, 1)
          const canvasWidth = Math.round(width * scale)
          const canvasHeight = Math.round(height * scale)
          
          const ctx = wx.createCanvasContext('optimize-canvas')
          
          ctx.drawImage(filePath, 0, 0, canvasWidth, canvasHeight)
          
          ctx.draw(false, () => {
            wx.canvasToTempFilePath({
              canvasId: 'optimize-canvas',
              quality: quality,
              success: (res) => {
                resolve(res.tempFilePath)
              },
              fail: reject
            })
          })
        },
        fail: reject
      })
    })
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor()

// 导出工具类
module.exports = {
  PerformanceMonitor,
  PerformanceOptimizer,
  performanceMonitor,
  
  // 便捷方法
  startTimer: (name) => performanceMonitor.startTimer(name),
  endTimer: (name) => performanceMonitor.endTimer(name),
  debounce: PerformanceOptimizer.debounce,
  throttle: PerformanceOptimizer.throttle,
  batchUpdate: PerformanceOptimizer.batchUpdate,
  lazyLoadImages: PerformanceOptimizer.lazyLoadImages,
  cleanupMemory: PerformanceOptimizer.cleanupMemory,
  optimizeImage: PerformanceOptimizer.optimizeImage
}