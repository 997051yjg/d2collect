// utils/propertyMap.js

// 定义颜色常量 (参考暗黑2风格)
const COLORS = {
    BLUE: '#4850B8',    // 魔法属性 / 施法相关
    RED: '#B04434',     // 火焰 / 生命 / 偷取
    GREEN: '#18FC00',   // 毒素 / 套装
    PURPLE: '#A020F0',  // 增强防御 / 全抗
    WHITE: '#FFFFFF',   // 基础属性
    YELLOW: '#D0D0D0',  // 闪电 / 命中
    GOLD: '#d4af37',    // 暗金 / 独特
    ORANGE: '#D08020'   // 制造 / 橙色
  };
  
  const PROPERTY_MAP = {
    // --- 基础属性 ---
    "str": { label: "力量", format: "+{0} 力量", color: COLORS.WHITE },
    "dex": { label: "敏捷", format: "+{0} 敏捷", color: COLORS.WHITE },
    "vit": { label: "体力", format: "+{0} 体力", color: COLORS.WHITE },
    "enr": { label: "精力", format: "+{0} 精力", color: COLORS.WHITE },
    "manarecovery": { label: "法力回复", format: "法力回复速度 +{0}%", color: COLORS.BLUE },
    "staminarecoverybonus": { label: "耐力回复", format: "耐力回复速度 +{0}%", color: COLORS.BLUE },
  
    // --- 战斗属性 ---
    "dmg%": { label: "增强伤害", format: "+{0}% 增强伤害", color: COLORS.BLUE },
    "dmg-min": { label: "最小伤害", format: "+{0} 最小伤害", color: COLORS.WHITE },
    "dmg-max": { label: "最大伤害", format: "+{0} 最大伤害", color: COLORS.WHITE },
    "swing2": { label: "攻击速度", format: "+{0}% 攻击速度", color: COLORS.GOLD },
    "cast2": { label: "快速施法", format: "+{0}% 快速施法速度", color: COLORS.BLUE },
    "move2": { label: "移动速度", format: "+{0}% 高速跑步/行走", color: COLORS.ORANGE },
    "tohit": { label: "准确率", format: "+{0} 准确率", color: COLORS.WHITE },
    "tohit%": { label: "准确率%", format: "+{0}% 准确率", color: COLORS.WHITE },
    "ac%": { label: "增强防御", format: "+{0}% 增强防御", color: COLORS.PURPLE },
    "red-dmg": { label: "伤害减少", format: "伤害减少 {0}", color: COLORS.WHITE },
    "red-mag": { label: "魔法伤害减少", format: "魔法伤害减少 {0}", color: COLORS.WHITE },
  
    // --- 元素与抗性 ---
    "res-all": { label: "所有抗性", format: "所有抗性 +{0}", color: COLORS.PURPLE },
    "res-fire": { label: "抗火", format: "抗火 +{0}%", color: COLORS.RED },
    "res-cold": { label: "抗寒", format: "抗寒 +{0}%", color: COLORS.BLUE },
    "res-ltng": { label: "抗闪电", format: "抗闪电 +{0}%", color: COLORS.YELLOW },
    "res-pois": { label: "抗毒", format: "抗毒 +{0}%", color: COLORS.GREEN },
    "fire-min": { label: "火焰伤害", format: "增加 {0}-{1} 火焰伤害", color: COLORS.RED }, // 需特殊处理双参数
    "light-min": { label: "闪电伤害", format: "增加 {0}-{1} 闪电伤害", color: COLORS.YELLOW },
    "cold-min": { label: "冰冷伤害", format: "增加 {0}-{1} 冰冷伤害", color: COLORS.BLUE },
    "pois-min": { label: "毒素伤害", format: "增加 {0} 毒素伤害", color: COLORS.GREEN },
  
    // --- 吸取与特殊 ---
    "lifesteal": { label: "生命偷取", format: "{0}% 生命于击中时偷取", color: COLORS.RED },
    "manasteal": { label: "法力偷取", format: "{0}% 法力于击中时偷取", color: COLORS.BLUE },
    "crush": { label: "压碎性打击", format: "{0}% 决定性打击", color: COLORS.WHITE },
    "deadly": { label: "致命攻击", format: "{0}% 致命攻击", color: COLORS.WHITE },
    "openwounds": { label: "撕裂伤口", format: "{0}% 撕裂伤口机会", color: COLORS.RED },
    "knock": { label: "击退", format: "击退", color: COLORS.WHITE },
    "freeze": { label: "冻结目标", format: "冻结目标 +{0}", color: COLORS.BLUE },
    "half-freeze": { label: "冰冻减半", format: "冰冻时间减半", color: COLORS.BLUE },
    "no-freeze": { label: "无法冰冻", format: "无法冰冻", color: COLORS.BLUE },
  
    // --- 技能 ---
    "allskills": { label: "所有技能", format: "+{0} 所有技能", color: COLORS.WHITE },
    "skill": { label: "特定技能", format: "+{0} {p} (限职业)", color: COLORS.WHITE }, // {p} 代表技能名参数
    "skill-class": { label: "职业技能", format: "+{0} {p}技能等级", color: COLORS.WHITE },
    "skill-tab": { label: "系别技能", format: "+{0} {p}", color: COLORS.WHITE }, // 如 +1 火焰技能
    
    // --- 其他 ---
    "mag%": { label: "魔法装备获取", format: "{0}% 更佳机会获得魔法装备", color: COLORS.GOLD },
    "gold%": { label: "金币获取", format: "{0}% 额外金币从怪物身上取得", color: COLORS.WHITE },
    "light": { label: "照亮范围", format: "+{0} 照亮范围", color: COLORS.WHITE },
    "dur": { label: "耐久度", format: "耐久度 +{0}%", color: COLORS.WHITE },
    "sock": { label: "孔数", format: "凹槽 ({0})", color: COLORS.WHITE },
    "indestruct": { label: "无法破坏", format: "无法破坏", color: COLORS.WHITE }
  };
  
  module.exports = {
    getPropertyConfig: (code) => PROPERTY_MAP[code] || { label: code, format: `${code} {0}`, color: '#AAAAAA' },
    COLORS
  };