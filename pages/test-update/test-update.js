// pages/test-update/test-update.js
Page({
  data: {
    isLoading: false,
    result: null
  },

  // 调用更新云函数
  callUpdateFunction() {
    this.setData({ isLoading: true })
    
    wx.cloud.callFunction({
      name: 'updateEquipmentTemplates',
      data: {}
    }).then(res => {
      console.log('云函数执行结果:', res)
      this.setData({
        isLoading: false,
        result: res.result
      })
      
      wx.showToast({
        title: '执行成功',
        icon: 'success'
      })
    }).catch(err => {
      console.error('云函数执行失败:', err)
      this.setData({
        isLoading: false,
        result: {
          success: false,
          message: '执行失败: ' + err.errMsg
        }
      })
      
      wx.showToast({
        title: '执行失败',
        icon: 'error'
      })
    })
  }
})