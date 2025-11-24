// 装备模板数据更新脚本
// 请在小程序云开发控制台中执行此脚本

const db = wx.cloud.database();
const _ = db.command;

// 中英文对照表
const chineseEnglishMap = {
  "Alma Negra": "黑暗之魂",
  "Andariel's Visage": "安达莉尔的仪容",
  "Annihilus": "毁灭",
  "Arachnid Mesh": "蜘蛛网纹",
  "Arioc's Needle": "艾里欧克之针",
  "Arkaine's Valor": "阿凯尼的荣耀",
  "Arm of King Leoric": "李奥瑞克的臂骨",
  "Arreat's Face": "亚瑞特之貌",
  "Astreon's Iron Ward": "阿斯特隆的陨铁杖",
  "Athena's Wrath": "雅典娜之怒",
  "Atma's Scarab": "阿特玛的圣甲虫",
  "Atma's Wail": "阿特玛的哭喊",
  "Axe of Fechmar": "费屈玛之斧",
  "Azurewrath": "碧蓝怒火",
  "Baezil's Vortex": "贝希尔的漩涡",
  "Bane Ash": "祸根之灰",
  "Baranar's Star": "巴拉纳之星",
  "Bartuc's Cut-Throat": "巴图克的割喉爪",
  "Biggin's Bonnet": "幼童软帽",
  "Bing Sz Wang": "冰之王",
  "Black Hades": "黑色冥王",
  "Blackbog's Sharp": "黑沼之锋",
  "Blackhand Key": "黑手钥匙",
  "Blackhorn's Face": "黑牛角面甲",
  "Blackleach Blade": "暗蚀之刃",
  "Blackoak Shield": "黑橡树盾",
  "Blacktongue": "黑舌",
  "Blade of Ali Baba": "阿里巴巴之刃",
  "Bladebone": "刃骨",
  "Bladebuckle": "刀刃腰扣",
  "Blastbark": "爆裂喧嚣",
  "Blinkbat's Form": "火蝠之影",
  "Blood Crescent": "血色新月",
  "Blood Raven's Charge": "血鸦的冲锋",
  "Bloodfist": "染血拳套",
  "Bloodletter": "放血者",
  "Bloodmoon": "血月",
  "Bloodrise": "血色飞星",
  "Bloodthief": "血贼",
  "Bloodtree Stump": "龙血木桩",
  "Boneflame": "骨焰",
  "Boneflesh": "骨肉分离",
  "Bonehew": "斩骨",
  "Boneshade": "白骨阴魂",
  "Boneslayer Blade": "碎骨者之刃",
  "Bonesnap": "碎骨",
  "Brainhew": "劈颅者",
  "Bul-Kathos' Wedding Band": "布尔凯索的婚戒",
  "Buriza-Do Kyanon": "暴雪重炮",
  "Butcher's Pupil": "屠夫之瞳",
  "Bverrit Keep": "贝弗提的壁垒",
  "Cairn Shard": "石冢碎片",
  "Carrion Wind": "腐肉之风",
  "Cerebus' Bite": "冥犬的撕咬",
  "Chance Guards": "吉运守护",
  "Chromatic Ire": "多彩之怒",
  "Cliffkiller": "峭壁杀手",
  "Cloudcrack": "裂云剑",
  "Coif of Glory": "荣光锁帽",
  "Coldkill": "冰殛",
  "Coldsteal Eye": "冷窃之眼",
  "Corpsemourn": "遗体哀悼",
  "Crainte Vomir": "恐惧喷吐",
  "Cranebeak": "鹤嘴锄",
  "Crescent Moon": "新月",
  "Crow Caw": "鸦鸣",
  "Crown of Ages": "年纪之冠",
  "Crown of Thieves": "盗贼皇冠",
  "Crushflange": "四叶破甲锤",
  "Culwen's Point": "库文之刺",
  "Dark Clan Crusher": "暗族粉碎者",
  "Darkforce Spawn": "魔力肇生",
  "Darkglow": "黑暗幽光",
  "Darksight Helm": "暗视头盔",
  "Death Cleaver": "死亡切肉斧",
  "Deathbit": "死亡之吻",
  "Death's Fathom": "死亡深渊",
  "Death's Web": "死亡迷网",
  "Deathspade": "死亡黑桃",
  "Demon Limb": "恶魔断肢",
  "Demon Machine": "恶魔机弩",
  "Demonhorn's Edge": "恶魔角锋",
  "Demon's Arch": "恶魔扑击",
  "Dimoak's Hew": "迪马克的劈斧",
  "Djinn Slayer": "邪灵斩",
  "Doombringer": "末日使者",
  "Doomslinger": "末日投手",
  "Dracul's Grasp": "德古拉之握",
  "Dragonscale": "龙鳞",
  "Duriel's Shell": "督瑞尔之壳",
  "Duskdeep": "黄昏薄暮",
  "Dwarf Star": "矮人之星",
  "Eaglehorn": "鹰之号角",
  "Earth Shifter": "撼地者",
  "Earthshaker": "震地者",
  "Endlesshail": "无尽冰雹",
  "Eschuta's Temper": "艾丝屈塔的脾气",
  "Ethereal Edge": "无形之锋",
  "Executioner's Justice": "行刑者的裁决",
  "Felloak": "凶猛橡木",
  "Firelizard's Talons": "火蜥蜴之爪",
  "Flamebellow": "怒焰咆哮",
  "Fleshrender": "血肉撕裂者",
  "Fleshripper": "血肉割裂者",
  "Frostburn": "霜灼",
  "Frostwind": "冰霜之风",
  "Gargoyle's Bite": "石像鬼之牙",
  "Gerke's Sanctuary": "基尔克的避难地",
  "Gheed's Fortune": "基德的好运",
  "Ghostflame": "魂焰",
  "Ghoulhide": "食尸鬼皮",
  "Giant Skull": "巨型颅骨",
  "Gimmershred": "寒铁飞刃",
  "Ginther's Rift": "金瑟的破空之痕",
  "Gleamscythe": "寒光镰刀",
  "Gloom's Trap": "阴影陷阱",
  "Goblin Toe": "哥布林之趾",
  "Goldskin": "黄金之肤",
  "Goldstrike Arch": "金击之弧",
  "Goldwrap": "金织带",
  "Gore Rider": "血骑士",
  "Gorefoot": "践血",
  "Goreshovel": "铲肉斧",
  "Gravenspine": "脊骨雕塑",
  "Gravepalm": "盗墓手套",
  "Greyform": "灰影",
  "Griffon's Eye": "狮鹫之眼",
  "Grim's Burning Dead": "格里姆的烈焰亡灵",
  "Griswold's Edge": "格里斯沃尔德之锋",
  "Guardian Angel": "守护天使",
  "Guardian Naga": "蛇神守护者",
  "Gull": "海鸥",
  "Gut Siphon": "碎胆",
  "Halaberd's Reign": "死亡女神的统治",
  "Hand of Blessed Light": "圣光之手",
  "Harlequin Crest": "谐角之冠",
  "Hawkmail": "雄鹰甲",
  "Head Hunter's Glory": "猎头者的荣耀",
  "Headstriker": "斩首者",
  "Heart Carver": "剜心者",
  "Heavenly Garb": "天界圣衣",
  "Heaven's Light": "天堂之光",
  "Hellcast": "狱火投手",
  "Hellclap": "地狱飞啸",
  "Hellfire Torch": "地狱火炬",
  "Hellmouth": "地狱之口",
  "Hellplague": "地狱瘟疫",
  "Hellrack": "地狱刑器",
  "Hellslayer": "地狱屠戮者",
  "Herald of Zakarum": "萨卡兰姆的使者",
  "Hexfire": "妖术之火",
  "Highlord's Wrath": "至高王之怒",
  "Homunculus": "魔胎",
  "Hone Sundan": "骨寸断",
  "Horizon's Tornado": "地平线的龙卷风",
  "Hotspur": "热刺靴",
  "Howltusk": "怒号长牙",
  "Humongous": "巨无霸",
  "Husoldal Evo": "皮肉吞噬者",
  "Iceblink": "闪耀冰晶",
  "Ichorsting": "灵液之刺",
  "Infernostride": "地狱阔步",
  "ira's Guardian": "奇拉的守护",
  "Iron Pelt": "铁皮",
  "Ironstone": "铁石",
  "Islestrike": "海岛之击",
  "Jade Talon": "碧玉爪",
  "Jalal's Mane": "狼王之鬃",
  "Kelpie Snare": "水妖捕叉",
  "Kinemil's Awl": "金麦尔的锥子",
  "Knell Striker": "丧钟敲击者",
  "Kuko Shakaku": "赤焰之击",
  "Lacerator": "撕裂者",
  "Lance Guard": "长枪卫士",
  "Lance of Yaggai": "亚盖长枪",
  "Langer Briser": "千步碎击",
  "Lava Gout": "熔岩痛击",
  "Leadcrow": "铅鸦",
  "Lenymo": "雷尼摩",
  "Leviathan": "利维坦",
  "Lidless Wall": "警戒之墙",
  "Lightsabre": "光之军刀",
  "Lycander's Aim": "莱姗德的远击",
  "Lycander's Flank": "莱姗德的侧击",
  "Maelstrom": "漩涡之力",
  "Magefist": "法师之拳",
  "Magewrath": "法师之怒",
  "Manald Heal": "马纳德的治疗",
  "Mang Song's Lesson": "宋满的教训",
  "Mara's Kaleidoscope": "玛拉的万花筒",
  "Marrowwalk": "骨髓行走",
  "Medusa's Gaze": "美杜莎的凝视",
  "Messerschmidt's Reaver": "梅塞施密特的劫掠者",
  "Metalgrid": "金属网格",
  "Moonfall": "月陨",
  "Moser's Blessed Circle": "莫泽的祝福圆盾",
  "Nagelring": "纳格尔之戒",
  "Nature's Peace": "大自然的安宁",
  "Nightsmoke": "夜烟",
  "Nightwing's Veil": "夜翼面纱",
  "Nokozan Relic": "诺克兰的遗物",
  "Nord's Tenderizer": "北方人的碎肉河蟹棒",
  "Nosferatu's Coil": "吸血圣王之圈",
  "Ondal's Wisdom": "温达的智慧",
  "Ormus' Robes": "奥玛斯的法袍",
  "Peasant Crown": "农夫兜帽",
  "Pelta Lunata": "新月小盾",
  "Pierre Tombale Couant": "墓石长戟",
  "Plague Bearer": "瘟疫散播者",
  "Pluckeye": "剜眼",
  "Pompeii's Wrath": "庞贝之怒",
  "Pus Spitter": "吐脓毒弩",
  "Que-Hegan's Wisdom": "魁黑刚的智慧",
  "Radament's Sphere": "罗达门特的领地",
  "Rainbow Facet": "彩虹魔石",
  "Rakescar": "钯肉斧",
  "Rattlecage": "作响之笼",
  "Raven Claw": "血鸦之爪",
  "Raven Frost": "乌鸦之霜",
  "Ravenlore": "乌鸦的智慧",
  "Razor's Edge": "剃刀之锋",
  "Razorswitch": "剃刀飞旋",
  "Razortail": "剃刀之尾",
  "Razortine": "剃刀尖齿",
  "Ribcracker": "肋骨粉碎者",
  "Riphook": "撕裂之钩",
  "Ripsaw": "碎肉锯",
  "Rixot's Keen": "瑞克撒特的挽歌",
  "Rockfleece": "石中毛",
  "Rockstopper": "磐石头盔",
  "Rogue's Bow": "游猎之弓",
  "Rune Master": "符文大师",
  "Rusthandle": "腐锈权柄",
  "Sandstorm Trek": "沙暴之旅",
  "Saracen's Chance": "撒拉森的胜机",
  "Schaefer's Hammer": "舍费尔之锤",
  "Seraph's Hymn": "炽天使的圣歌",
  "Serpent Lord": "海蛇之王",
  "Shadow Dancer": "影舞者",
  "Shadow Killer": "影弑",
  "Shadowfang": "暗影之牙",
  "Shaftstop": "摧锋甲",
  "Silks of the Victor": "胜者的丝绸",
  "Silkweave": "丝织靴",
  "Skewer of Krintiz": "克林茨的肉叉",
  "Skin of Flayed One": "剥皮魔之皮",
  "Skin of the Vipermagi": "蝮蛇法妖之皮",
  "Skull Collector": "骷髅收集者",
  "Skull Splitter": "凿颅者",
  "Skullder's Ire": "诗寇蒂的愤怒",
  "Skystrike": "天击",
  "Snakecord": "蛇皮索",
  "Snowclash": "冰雪之击",
  "Soul Drainer": "吸魂者",
  "Soul Harvest": "收魂者",
  "Soulfeast Tine": "噬魂叉",
  "Soulflay": "剥魂者",
  "Sparking Mail": "电光锁甲",
  "Spectral Shard": "彩虹碎片",
  "Spellsteel": "魔咒之钢",
  "Spike Thorn": "尖刺荆棘",
  "Spineripper": "裂脊者",
  "Spire of Honor": "荣耀之巅",
  "Spire of Lazarus": "拉扎鲁斯的螺旋杖",
  "Spirit Forge": "灵魂熔炉",
  "Spirit Keeper": "灵体守护者",
  "Spirit Ward": "灵体守护",
  "Stealskull": "偷取颅盔",
  "Steel Carapace": "钢铁甲壳",
  "Steel Pillar": "钢铁支柱",
  "Steel Shade": "钢罩",
  "Steelclash": "响钢",
  "Steeldriver": "钢榔头",
  "Steelgoad": "钢刺棒",
  "Steelrend": "碎钢",
  "Stone Crusher": "碎石者",
  "Stoneraven": "石鸦",
  "Stormchaser": "风暴追逐者",
  "Stormeye": "风暴之眼",
  "Stormguild": "风暴行会",
  "Stormlash": "风暴之鞭",
  "Stormrider": "御雷者",
  "Stormshield": "暴风之盾",
  "Stormspike": "风暴匕刺",
  "Stormspire": "暴风螺旋",
  "Stormstrike": "风暴之击",
  "Stoutnail": "坚硬钉爪",
  "String of Ears": "缠腰耳串",
  "Suicide Branch": "自戕树杈",
  "Sureshrill Frost": "神河之霜",
  "Swordback Hold": "剑背之架",
  "Swordguard": "卫剑",
  "Tarnhelm": "塔恩之盔",
  "Tearhaunch": "刺股靴",
  "Templar's Might": "圣殿骑士之力",
  "The Atlantean": "亚特兰蒂斯剑",
  "The Battlebranch": "突围者",
  "The Cat's Eye": "猫眼",
  "The Centurion": "百夫长",
  "The Chieftain": "酋长",
  "The Cranium Basher": "碎颅",
  "The Diggler": "迪格勒",
  "The Dragon Chang": "龙枪",
  "The Eye of Etlich": "艾利奇之眼",
  "The Face of Horror": "恐惧面容",
  "The Fetid Sprinkler": "恶臭喷杖",
  "The Gavel of Pain": "苦痛木槌",
  "The General's Tan Do Li Ga": "将军的短连枷",
  "The Gladiator's Bane": "角斗士之祸",
  "The Gnasher": "血肉撕咬",
  "The Grandfather": "祖父",
  "The Grim Reaper": "恐怖收割者",
  "The Hand of Broc": "布洛克之手",
  "The Impaler": "穿刺者",
  "The Iron Jang Bong": "铁长棍",
  "The Jade Tan Do": "玉尖刀",
  "The Mahim-Oak Curio": "马哈姆橡木珍品",
  "The Meat Scraper": "刮肉长戟",
  "The Minotaur": "牛魔斧",
  "The Oculus": "海妖之瞳",
  "The Patriarch": "大族长",
  "The Reaper's Toll": "死神的丧钟",
  "The Redeemer": "救赎者",
  "The Rising Sun": "旭日",
  "The Salamander": "沙罗曼",
  "The Scalper": "头皮剥离者",
  "The Spirit Shroud": "覆灵尸衣",
  "The Stone of Jordan": "乔丹之石",
  "The Tannr Gorerod": "皮匠的血刺枪",
  "The Vile Husk": "邪祟之牙",
  "The Ward": "御敌",
  "Thundergod's Vigor": "雷神之力",
  "Thunderstroke": "雷击",
  "Tiamat's Rebuke": "魔龙的斥责",
  "Titan's Revenge": "泰坦的复仇",
  "Todesfaelle Flamme": "索命之焰",
  "Tomb Reaver": "墓穴劫掠者",
  "Toothrow": "排齿",
  "Torch of Iro": "伊洛的火炬",
  "Treads of Cthon": "克索恩的征途",
  "Twitchthroe": "抽搐阵痛",
  "Tyrael's Might": "泰瑞尔的力量",
  "Umbral Disk": "太阳黑轮",
  "Ume's Lament": "婴灵的哀歌",
  "Undead Crown": "不死王冠",
  "Valkyrie Wing": "女武神之翼",
  "Vampire Gaze": "吸血鬼的凝视",
  "Veil of Steel": "钢铁面纱",
  "Venom Grip": "剧毒之握",
  "Venom Ward": "毒液禁区",
  "Verdungo's Hearty Cord": "行刑者的绞首绳",
  "Viperfork": "蛇信长枪",
  "Visceratuant": "刨肠",
  "Wall of the Eyeless": "无眼之墙",
  "War Traveler": "战争旅者",
  "Warlord's Trust": "战争领主的信赖",
  "Warpspear": "扭曲之矛",
  "Warshrike": "战争伯劳鸟",
  "Waterwalk": "水上飘",
  "Widowmaker": "寡妇制造",
  "Windforce": "风之力",
  "Windhammer": "风锤",
  "Wisp Projector": "鬼火投影",
  "Witchwild String": "狂法劲弦",
  "Witherstring": "凋零之击",
  "Wizardspike": "巫师之刺",
  "Wizendraw": "凋零劲弦",
  "Woestave": "降灾长戟",
  "Wolfhowl": "狼嚎",
  "Wormskull": "蛆虫头骨",
  "Wraith Flight": "怨灵飞行",
  "Zakarum's Hand": "萨卡兰姆之手"
};

// 检查是否是中文文本
function isChineseText(text) {
  if (!text) return false;
  return /[\u4e00-\u9fff]/.test(text);
}

// 生成云存储路径
function generateImagePath(chineseName) {
  return `cloud://cloud1-7g43dval99d60dca.636c-cloud1-7g43dval99d60dca-1385676003/unique_image/${chineseName}.png`;
}

async function updateEquipmentTemplates() {
  console.log('开始更新装备模板数据...');
  
  try {
    // 1. 获取所有装备模板
    const { data: templates } = await db.collection('equipment_templates')
      .field({
        _id: true,
        name: true,
        name_zh: true,
        image: true
      })
      .get();
    
    console.log('共找到', templates.length, '个装备模板');
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updatePromises = [];
    
    // 2. 遍历每个模板，检查是否需要更新
    for (const template of templates) {
      const englishName = template.name;
      let currentChineseName = template.name_zh || '';
      
      // 如果当前name_zh已经是中文，跳过
      if (isChineseText(currentChineseName)) {
        console.log(`跳过 ${englishName} - name_zh已经是中文: ${currentChineseName}`);
        skippedCount++;
        continue;
      }
      
      // 查找对应的中文名
      let newChineseName = chineseEnglishMap[englishName];
      
      if (!newChineseName) {
        console.log(`警告: 未找到 ${englishName} 的中文翻译`);
        skippedCount++;
        continue;
      }
      
      // 生成新的image路径
      const newImagePath = generateImagePath(newChineseName);
      
      // 准备更新数据
      const updateData = {
        name_zh: newChineseName,
        image: newImagePath
      };
      
      console.log(`更新 ${englishName}: `);
      console.log(`  - name_zh: ${currentChineseName} -> ${newChineseName}`);
      console.log(`  - image: ${newImagePath}`);
      
      // 添加到更新队列
      updatePromises.push(
        db.collection('equipment_templates')
          .doc(template._id)
          .update({
            data: updateData
          })
      );
      
      updatedCount++;
    }
    
    // 3. 批量执行更新
    if (updatePromises.length > 0) {
      console.log('执行批量更新...');
      await Promise.all(updatePromises);
      console.log('批量更新完成');
    }
    
    console.log('========== 更新完成 ==========');
    console.log('更新数量:', updatedCount);
    console.log('跳过数量:', skippedCount);
    console.log('总计:', templates.length);
    
  } catch (error) {
    console.error('更新失败:', error);
  }
}

// 执行更新
updateEquipmentTemplates();