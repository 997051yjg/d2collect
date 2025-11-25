// 装备类型映射工具
// 英文类型 -> 中文分类

const typeMapping = {
    "ring": [
        "Ring",
    ],
    "amulet": [
        "Amulet",
    ],
    "charm": [
        "Charm",
    ],
    "jewel": [
        "Jewel",
    ],
    "helmet": [
        "Armet",
        "Basinet",
        "Bone Helm",
        "Bone Visage",
        "Cap",
        "Casque",
        "Conqueror Crown",
        "Corona",
        "Crown",
        "Death Mask",
        "Destroyer Helm",
        "Diadem",
        "Full Helm",
        "Fury Visor",
        "Grand Crown",
        "Great Helm",
        "Grim Helm",
        "Helm",
        "Mask",
        "Sallet",
        "Shako",
        "Skull Cap",
        "Spired Helm",
        "Tiara",
        "War Hat",
        "Winged Helm"
    ],
    "boots": [
        "Battle Boots",
        "Boneweave Boots",
        "Chain Boots",
        "Demonhide Boots",
        "Heavy Boots",
        "Leather Boots",
        "Light Plate Boots",
        "Mesh Boots",
        "Myrmidon Greaves",
        "Plate Boots",
        "Scarabshell Boots",
        "Sharkskin Boots",
        "Tearhaunch",
        "War Boots"
    ],
    "gloves": [
        "Battle Guantlets",
        "Bracers",
        "Demonhide Gloves",
        "Gauntlets",
        "Gloves",
        "Heavy Bracers",
        "Heavy Gloves",
        "Light Gauntlets",
        "Ogre Gauntlets",
        "Sharkskin Gloves",
        "Vambraces",
        "Vampirebone Gloves",
        "War Gauntlets"
    ],
    "belt": [
        "Battle Belt",
        "Belt",
        "Demonhide Sash",
        "Girdle",
        "Heavy Belt",
        "Light Belt",
        "Mesh Belt",
        "Mithril Coil",
        "Sash",
        "Sharkskin Belt",
        "Spiderweb Sash",
        "Vampirefang Belt",
        "War Belt"
    ],
    "armor": [
        "Ancient Armor",
        "Balrog Skin",
        "Breast Plate",
        "Chain Mail",
        "Chaos Armor",
        "Cuirass",
        "Demonhide Armor",
        "Dusk Shroud",
        "Embossed Plate",
        "Field Plate",
        "Full Plate Mail",
        "Ghost Armor",
        "Gothic Plate",
        "Hard Leather",
        "Kraken Shell",
        "Leather Armor",
        "Light Plate",
        "Linked Mail",
        "Mage Plate",
        "Mesh Armor",
        "Ornate Armor",
        "Plate Mail",
        "Quilted Armor",
        "Ring Mail",
        "Russet Armor",
        "Sacred Armor",
        "Scale Mail",
        "SerpentSkin Armor",
        "Shadow Plate",
        "Sharktooth Armor",
        "Splint Mail",
        "Studded Leather",
        "Templar Coat",
        "Tigulated Mail",
        "Tresllised Armor",
        "Wire Fleece"
    ],
    "weapon": [
        "2-Handed Sword",
        "Aerin Shield",
        "Aegis",
        "Ancient Axe",
        "Ancient Shield",
        "Ancient Sword",
        "Arbalest",
        "Archon Staff",
        "Ataghan",
        "Axe",
        "Balrog Blade",
        "Balrog Spear",
        "Balista",
        "Barbed Club",
        "Barbed Shield",
        "Bardiche",
        "Bastard Sword",
        "Battle Axe",
        "Battle Hammer",
        "Battle Scythe",
        "Battle Staff",
        "Battle Sword",
        "Bearded Axe",
        "Bec-de-Corbin",
        "Berserker Axe",
        "Bill",
        "Blade",
        "Bone Knife",
        "Bone Shield",
        "Bone Wand",
        "Brandistock",
        "Broad Axe",
        "Broad Sword",
        "Buckler",
        "Burnt Wand",
        "Caduceus",
        "Cedar Staff",
        "CedarBow",
        "Ceremonial Bow",
        "Ceremonial Javelin",
        "Ceremonial Pike",
        "Champion Axe",
        "Champion Sword",
        "Chu-Ko-Nu",
        "Cinquedeas",
        "Claymore",
        "Cleaver",
        "Club",
        "Colossus Blade",
        "Colossus Crossbow",
        "Composite Bow",
        "Crossbow",
        "Crowbill",
        "Crusader Bow",
        "Cryptic Axe",
        "Cryptic Sword",
        "Cudgel",
        "Cutlass",
        "Dacian Falx",
        "Dagger",
        "Decapitator",
        "Defender",
        "Devil Star",
        "Dimensional Blade",
        "Dirk",
        "Divine Scepter",
        "Double Axe",
        "Double Bow",
        "Dragon Shield",
        "Edge Bow",
        "Elder Staff",
        "Elegant Blade",
        "Espadon",
        "Executioner Sword",
        "Falchion",
        "Fanged Knife",
        "Feral Claws",
        "Field Plate",
        "Flail",
        "Flamberge",
        "Flanged Mace",
        "Flying Axe",
        "Francisca",
        "Fuscina",
        "Giant Axe",
        "Giant Sword",
        "Giant Thresher",
        "Gladius",
        "Gnarled Staff",
        "Gothic Axe",
        "Gothic Shield",
        "Gothic Staff",
        "Gothic Sword",
        "Grand Scepter",
        "Grave Wand",
        "Great Axe",
        "Great Maul",
        "Great Sword",
        "Grim Scythe",
        "Grim Shield",
        "Grim Wand",
        "Halberd",
        "Hand Axe",
        "Hatchet",
        "Heavy Crossbow",
        "Heirophant Trophy",
        "Holy Water Sprinkler",
        "Hunter Bow",
        "Hydra Bow",
        "Hyperion Spear",
        "Jagged Star",
        "Jo Stalf",
        "Kite Shield",
        "Knout",
        "Kris",
        "Lance",
        "Lance of Yaggai",
        "Large Shield",
        "Legend Spike",
        "Legendary Mallet",
        "Lich Wand",
        "Light Crossbow",
        "Lochaber Axe",
        "Long Battle Bow",
        "Long Bow",
        "Long Siege Bow",
        "Long Staff",
        "Long Sword",
        "Long War Bow",
        "Luna",
        "Mace",
        "Martel de Fer",
        "Matriarchal Javelin",
        "Matriarchal Spear",
        "Maul",
        "Mesh Armor",
        "Mighty Scepter",
        "Military Axe",
        "Military Pick",
        "Monarch",
        "Morning Star",
        "Naga",
        "Ogre Axe",
        "Ogre Maul",
        "Partizan",
        "Pavise",
        "Petrified Wand",
        "Phase Blade",
        "Pike",
        "Poignard",
        "Poleaxe",
        "Quarterstaff",
        "Razor Bow",
        "Repeating Crossbow",
        "Rondel",
        "Round Shield",
        "Rune Scepter",
        "Rune Staff",
        "Rune Sword",
        "Saber",
        "Sacred Rondache",
        "Sallet",
        "Scimitar",
        "Scourge",
        "Scutum",
        "Scythe",
        "Scepter",
        "Shamshir",
        "Short Battle Bow",
        "Short Bow",
        "Short Staff",
        "Short Sword",
        "Short War Bow",
        "Short Siege Bow",
        "Siege Crossbow",
        "Silver-Edged Axe",
        "Small Shield",
        "Spear",
        "Spetum",
        "Spiked Club",
        "Spiked Shield",
        "Staff of Kings",
        "Stilleto",
        "Stone Crusher",
        "Stoneraven",
        "Succubae Skull",
        "Swirling Crystal",
        "Swordguard",
        "Tabar",
        "Thunder Maul",
        "Tomb Wand",
        "Tomahawk",
        "Tower Shield",
        "Trident",
        "Tusk Sword",
        "Twin Axe",
        "Unearthed Wand",
        "Viperfork",
        "Voulge",
        "Wand",
        "War Club",
        "War Fork",
        "War Hammer",
        "War Scythe",
        "War Scepter",
        "War Spear",
        "War Staff",
        "War Sword",
        "War Axe",
        "War Pike",
        "Ward Bow",
        "Winged Axe",
        "Winged Harpoon",
        "Winged Knife",
        "Wrist Sword",
        "Yari",
        "Yew Wand",
        "Zakarum Shield",
        "Zweihander"
    ]
}

// 中文分类映射
const chineseCategoryMap = {
    "ring": "戒指",
    "amulet": "项链", 
    "charm": "护身符",
    "jewel": "珠宝",
    "helmet": "头部",
    "boots": "鞋子",
    "gloves": "手套",
    "belt": "腰带",
    "armor": "盔甲",
    "weapon": "手持"
}

// 根据英文类型获取中文分类
function getChineseCategory(englishType) {
    if (!englishType) return null
    
    // 遍历所有分类，检查英文类型是否在对应数组中
    for (const [category, types] of Object.entries(typeMapping)) {
        if (types.includes(englishType)) {
            return chineseCategoryMap[category]
        }
    }
    
    return null // 未找到匹配的类型
}

// 检查英文类型是否属于某个大类
function isTypeInCategory(englishType, category) {
    if (!englishType || !category) return false
    
    // 获取该大类下的所有英文类型
    const categoryTypes = typeMapping[category]
    if (!categoryTypes) return false
    
    // 修复：不区分大小写匹配
    return categoryTypes.some(type => 
        type.toLowerCase() === englishType.toLowerCase()
    )
}

// 获取英文类型对应的分类键（如 "Sword" -> "weapon"）
function getCategoryKey(englishType) {
    if (!englishType) return null
    
    for (const [category, types] of Object.entries(typeMapping)) {
        if (types.includes(englishType)) {
            return category
        }
    }
    
    return null
}

// 获取所有中文分类
function getAllChineseCategories() {
    return Object.values(chineseCategoryMap)
}

// 获取筛选器选项
function getFilterOptions() {
    return Object.entries(chineseCategoryMap).map(([key, value]) => ({
        key: key,
        value: value
    }))
}

// 导出模块
module.exports = {
    typeMapping,
    chineseCategoryMap,
    getChineseCategory,
    isTypeInCategory,
    getCategoryKey,
    getAllChineseCategories,
    getFilterOptions
}