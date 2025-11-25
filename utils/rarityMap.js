// 装备品质映射配置
// 根据新的字段判断标准：
// 带有rarity字段的就是暗金
// 带有set字段的是套装  
// 带有rune字段的是符文之语

// 获取品质显示文本
function getRarityText(equipment) {
  // 根据字段存在性判断品质
  if (equipment.rune) {
    return '符文之语'
  } else if (equipment.set) {
    return '套装'
  } else if (equipment.rarity) {
    return '暗金'
  }
  return '普通'
}

// 获取品质对应的CSS类名
function getRarityClass(equipment) {
  const rarityText = getRarityText(equipment)
  switch (rarityText) {
    case '暗金': return 'unique'
    case '套装': return 'suit'
    case '符文之语': return 'runeword'
    default: return ''
  }
}

// 检查是否为特定品质
function isUnique(equipment) {
  return !!equipment.rarity
}

function isSuit(equipment) {
  return !!equipment.set
}

function isRuneWord(equipment) {
  return !!equipment.rune
}

module.exports = {
  getRarityText,
  getRarityClass,
  isUnique,
  isSuit,
  isRuneWord
}