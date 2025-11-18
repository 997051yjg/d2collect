// config/guide.js
// 用户引导和提示信息配置

module.exports = {
  // 首次使用引导
  firstTimeGuide: {
    title: '欢迎使用暗黑2装备图鉴',
    content: `这是一个专为暗黑2玩家打造的装备收集工具。您可以：

🔮 上传装备照片自动识别
📚 管理您的装备收藏
🏆 查看收集进度和成就
🤝 与其他玩家分享您的收藏

立即登录开始您的装备收集之旅！`
  },
  
  // 登录提示
  loginGuide: {
    title: '需要登录',
    content: '请先登录以使用完整功能，包括：\n✓ 装备上传\n✓ 图鉴收藏\n✓ 成就系统\n✓ 数据同步',
    confirmText: '立即登录',
    cancelText: '稍后再说'
  },
  
  // 功能提示
  featureTips: {
    upload: {
      title: '上传功能提示',
      content: '请选择清晰的装备照片，系统会自动识别装备信息。建议：\n• 背景简洁\n• 光线充足\n• 装备完整可见'
    },
    collection: {
      title: '图鉴功能提示',
      content: '图鉴显示所有可收集的装备，已激活的装备会高亮显示。您可以：\n• 筛选不同类别\n• 搜索特定装备\n• 查看收集进度'
    },
    achievement: {
      title: '成就系统提示',
      content: '完成特定任务可获得成就，包括：\n• 首次上传装备\n• 收集特定数量装备\n• 完成套装收集\n• 达到里程碑进度'
    }
  },
  
  // 错误提示
  errorMessages: {
    network: '网络连接失败，请检查网络设置',
    authDeny: '授权被拒绝，请重新授权',
    fileTooLarge: '文件过大，请选择小于5MB的图片',
    uploadFailed: '上传失败，请重试',
    loginFailed: '登录失败，请检查网络或重试'
  },
  
  // 成功提示
  successMessages: {
    loginSuccess: '登录成功',
    uploadSuccess: '装备上传成功',
    achievementUnlock: '成就解锁！'
  }
}