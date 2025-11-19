// pages/performance/performance.js
const app = getApp()
const { performanceMonitor } = require('../../utils/performance.js')

Page({
  data: {
    performanceReport: {},
    isMonitoring: true,
    cacheInfo: {},
    memoryInfo: {}
  },

  onLoad() {
    this.loadPerformanceData()
    this.loadCacheInfo()
    this.loadMemoryInfo()
  },

  // 加载性能数据
  loadPerformanceData() {
    const report = performanceMonitor.generateReport()
    this.setData({
      performanceReport: report
    })
  },

  // 加载缓存信息
  loadCacheInfo() {
    try {
      const storageInfo = wx.getStorageInfoSync()
      const cacheKeys = Object.keys(storageInfo.keys || {})
      
      const cacheInfo = {
        totalSize: storageInfo.currentSize,
        limitSize: storageInfo.limitSize,
        cacheCount: cacheKeys.length,
        performanceCacheCount: cacheKeys.filter(key => key.startsWith('cache_')).length
      }
      
      this.setData({ cacheInfo })
    } catch (error) {
      console.error('获取缓存信息失败:', error)
    }
  },

  // 加载内存信息（模拟）
  loadMemoryInfo() {
    // 在小程序中无法直接获取内存信息，这里模拟一些指标
    const memoryInfo = {
      usedMemory: Math.round(Math.random() * 100) + 50, // 模拟50-150MB
      performanceDataCount: Object.keys(performanceMonitor.metrics).length,
      activeTimers: Object.keys(performanceMonitor.timers).length
    }
    
    this.setData({ memoryInfo })
  },

  // 切换监控状态
  toggleMonitoring() {
    const newState = !this.data.isMonitoring
    performanceMonitor.setEnabled(newState)
    
    this.setData({
      isMonitoring: newState
    })
    
    wx.showToast({
      title: newState ? '性能监控已开启' : '性能监控已关闭',
      icon: 'success'
    })
  },

  // 清空性能数据
  clearPerformanceData() {
    performanceMonitor.clear()
    this.loadPerformanceData()
    
    wx.showToast({
      title: '性能数据已清空',
      icon: 'success'
    })
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            const storageInfo = wx.getStorageInfoSync()
            const cacheKeys = Object.keys(storageInfo.keys || {})
            
            // 清理所有缓存
            cacheKeys.forEach(key => {
              if (key.startsWith('cache_')) {
                wx.removeStorageSync(key)
              }
            })
            
            this.loadCacheInfo()
            
            wx.showToast({
              title: '缓存已清理',
              icon: 'success'
            })
          } catch (error) {
            wx.showToast({
              title: '清理失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 运行性能测试
  runPerformanceTest() {
    wx.showLoading({
      title: '性能测试中...'
    })

    // 模拟性能测试
    setTimeout(() => {
      // 模拟一些性能数据
      performanceMonitor.startTimer('testQuery')
      setTimeout(() => {
        performanceMonitor.endTimer('testQuery')
        
        performanceMonitor.startTimer('testRender')
        setTimeout(() => {
          performanceMonitor.endTimer('testRender')
          
          this.loadPerformanceData()
          wx.hideLoading()
          
          wx.showToast({
            title: '性能测试完成',
            icon: 'success'
          })
        }, 200)
      }, 300)
    }, 500)
  },

  // 导出性能报告
  exportReport() {
    const report = performanceMonitor.generateReport()
    const reportText = JSON.stringify(report, null, 2)
    
    // 在小程序中无法直接下载文件，这里显示在控制台
    console.log('性能报告:', report)
    
    wx.showModal({
      title: '性能报告',
      content: '性能报告已输出到控制台，请查看开发者工具',
      showCancel: false
    })
  }
})