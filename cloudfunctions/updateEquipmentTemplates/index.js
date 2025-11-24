// cloudfunctions/initEquipmentData/index.js
const cloud = require('wx-server-sdk')
const fs = require('fs')
const path = require('path')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 1.在此处粘贴你提供的新文件内容 (中英文对照 + 任务物品)
const rawTranslationText = `
Wall of the Eyeless	无眼之墙 	
Wormskull	温暖骷髅 	
Iceblink	冰雪眨眼 	
Spirit Ward	魂系结界 	
Demonlimb	恶魔爪牙 	
Wolfhowl	狼嚎 	
Gull	海鸥 	
Blackleach Blade	黑水之刃 	
Widowmaker	戮夫刃 	
The Jade Tan Do	坦杜之玉 	
Greyform	薄暮外观 	
Grim's Burning Dead	惊怖焰亡灵 	
Vampiregaze	吸血鬼的凝视 	
Umes Lament	乌米的恸哭 	
Bloodthief	血之偷 	
Fleshripper	裂肉者 	
Ghostflame	鬼火焰 	
Stone Crusher	碎石者 	
Schaefer's Hammer	史恰佛之槌 	
Fathom	死亡深度 	
Viperfork	蝮蛇叉 	
Spiritkeeper	灵魂看守者 	
Stormguild	暴风公会 	
Kinemils Awl	金麦尔的锥子 	
Dimoaks Hew	迪马克之劈砍 	
Bonesob	碎骨 	
Lance of Yaggai	雅该长矛 	
Spike Thorn	尖刺根源 	
Lance Guard	长枪守卫 	
Fleshrender	血肉裁决者 	
Crushflange	压碎的边缘 	
Headhunter's Glory	猎头人的荣耀 	
Shadowkiller	影杀者 	
Pluckeye	勇气之眼 	
Whichwild String	狂野之弦 	
Bane Ash	祸根之灰 	
Rixots Keen	瑞克撒特的挽歌 	
Hellclap	作响的地狱 	
Pelta Lunata	新月小盾 	
Baranar's Star	巴拉那之星 	
Gutsiphon	内脏吸管 	
Andariel's Visage	安达利尔的面貌 	
The Scalper	圆凿 	
Que-Hegan's Wisdon	魁金刚的智慧 	
Visceratuant	维斯尔坦特 	
Gimmershred	碎片贪婪者 	
Skystrike	天击 	
Plague Bearer	疾病带原者 	
Zakarum's Hand	撒卡兰姆之手 	
Magewrath	巫师之怒 	
Skullcollector	骷髅收集者 	
Duskdeep	黄昏深处 	
Goldskin	黄金之皮 	
The Ward	囚房 	
Godstrike Arch	金击圆弧 	
Cloudcrack	云裂 	
Rattlecage	作响之龙 	
Boneslayer Blade	碎骨者之刃 	
Warpspear	扭曲之矛 	
Pullspite	毒液怪 	
Spellsteel	钢铁魔咒 	
Steelgoad	铁刺棒 	
Radimant's Sphere	罗达门特之球体 	
The Minataur	牛头怪 	
The Atlantian	亚特拉斯 	
Arm of King Leoric	李奥瑞克王的武器 	
Gravenspine	墓穴之脊 	
Eschuta's temper	艾斯屈塔的脾气 	
Doombringer	末日毁灭者 	
Wraithflight	死灵夜翔 	
The Spirit Shroud	灵魂帷幕 	
Dark Clan Crusher	暗族碎灭者 	
Giantskull	巨骷髅 	
Wizardspike	巫师之刺 	
Marrowwalk	骨髓行走 	
Skin of the Vipermagi	蛇魔法师之皮 	
Leviathan	海王利维亚桑 	
Arioc's Needle	爱理欧克之针 	
Messerschmidt's Reaver	希梅斯特的掠夺 	
Tearhaunch	泪之臀 	
Duriel's Shell	都瑞尔的壳 	
Corpsemourn	尸体的哀伤 	
Azurewrath	青色忿怒 	
Lightsabre	光之军刀 	
Azurewrath	青色忿怒 	
Undead Crown	不死皇冠 	
Ormus' Robes	奥玛斯的长袍 	
Demonhorn's Edge	恶魔号角的边缘 	
Pompe's Wrath	庞贝之怒 	
Black Hades	黑色黑蒂斯 	
Steelshade	钢影 	
Shadowdancer	影舞者 	
Titan's Revenge	泰坦的复仇 	
Lycander's Flank	雷山德的侧腹 	
Lycander's Aim	雷山德的指标 	
Homunculus	侏儒 	
Stormspire	暴风尖塔 	
Nagelring	拿各的戒指 	
Manald Heal	玛那得的治疗 	
The Stone of Jordan	乔丹之石 	
Raven Frost	乌鸦之霜 	
Dwarf Star	矮人之星 	
Bul Katho's Wedding Band	布尔凯索之戒 	
Carrion Wind	腐肉之风 	
Nature's Peace	大自然的和平 	
Wisp	鬼火投射者 	
Constricting Ring	收缩戒指 	
Bladebuckle	锋利扣带 	
Carin Shard	凯恩碎片 	
Windforce	风之力 	
Fechmars Axe	费屈玛之斧 	
Crown of Thieves	盗贼皇冠 	
Blacktongue	黑色之舌 	
Hellrack	地狱拷问 	
The Grandfather	祖父 	
The Iron Jang Bong	铁检棒 	
Rakescar	火钩之伤 	
The Grim Reaper	冷酷开膛手 	
Bloodtree Stump	血树残株 	
Stormeye	暴风眼 	
Hellmouth	地狱之嘴 	
Ironstone	钻石 	
Thudergod's Vigor	雷神之力 	
The Impaler	穿刺者 	
Soulfeast Tine	噬魂叉 	
Culwens Point	库尔温的尖端 	
Gorerider	蚀肉骑士 	
Moonfall	落月 	
Warlord's Trust	战爵之证 	
Harlequin Crest	谐角之冠 	
Boneflesh	骨肉 	
Ginther's Rift	金瑟的裂缝 	
Nightsmoke	夜烟 	
Tarnhelm	塔因头盔 	
Deathcleaver	死亡之刀 	
Goreshovel	血块之铲 	
Griswolds Edge	格理斯瓦得的锐利 	
Stoutnail	坚硬的指甲 	
Earthshifter	大地变形者 	
The Cranium Basher	碎脑槌 	
Lidless Wall	警戒之墙 	
Spiritforge	灵魂熔炉 	
Soul Harvest	灵魂采集者 	
Witherstring	凋谢之戒 	
Stormchaser	暴风追逐者 	
Hawkmail	鹰甲 	
Bloodrise	血升 	
Ribcracker	肋骨粉碎者 	
Tiamat's Rebuke	魔龙的非难 	
The Meat Scraper	刮肉者 	
Bloodletter	血书 	
Skullder's Ire	诗寇蒂的愤怒 	
Nightwing's Veil	夜翼面纱 	
Veil of Steel	钢铁面纱 	
The Tannr Gorerod	坦之血杖 	
Firelizard's Talons	火蜥蜴之爪 	
Verdugo's Hearty Cord	维尔登戈的心结 	
The Face of Horror	恐惧之脸 	
Kelpie Snare	水魔陷阱 	
Venom Grip	剧毒之抓 	
Infernostride	地狱阔步 	
String of Ears	长串之耳 	
Skin of the Flayerd One	剥皮者之皮 	
Felloak	凶猛橡树 	
Blackhand Key	黑手之钥 	
Guardian Naga	蛇神守护者 	
Buriza-Do Kyanon	布理撒·多·凯南 	
Boneflame	骨焰 	
Thunderstroke	雷击 	
Bloodraven's Charge	血鸟的袭击 	
Stoneraven	石乌鸦 	
Ironpelt	掷铁 	
Blinkbats Form	眨眼蝙蝠的外观 	
The Hand of Broc	柏克之手 	
Hotspur	热靴刺 	
Deaths's Web	死亡之网 	
Blackbog's Sharp	黑沼之锋 	
Islestrike	岛击 	
Heaven's Light	天堂之光 	
The Reedeemer	忏悔者 	
Razorswitch	摆动剃刀 	
Demon Machine	恶魔机器 	
Butcher's Pupil	屠夫之瞳 	
Rockstopper	岩石制动者 	
Steelclash	作响的金属 	
Darksight Helm	暗视之盔 	
Snakecord	蛇索 	
Leadcrow	引导乌鸦 	
Goblin Toe	小妖精脚趾 	
Magefist	法师之拳 	
Heavenly Garb	天堂装束 	
Griffon's Eye	格利风之眼 	
Knell Striker	敲击丧钟者 	
Executioner's Justice	刽子手的裁决 	
Spineripper	裂脊者 	
The Reaper's Toll	死神的丧钟 	
Todesfaelle Flamme	特迪斯法雷·芙法米 	
Dragonscale	龙鳞 	
Razortine	剃刀之叉 	
Hone Sundan	宏·森丹 	
Kira's Guardian	奇拉的守护 	
Arreat's Face	亚瑞特的面容 	
Toothrow	排齿 	
Razortail	剃刀之尾 	
Waterwalk	水上飘 	
Gravepalm	墓穴的抚弄 	
Kuko Shakaku	社角久子 	
Chromatic Ire	五彩的怒气 	
Suicide Branch	自杀支系 	
Tomb Reaver	盗墓者 	
Frostwind	冰霜之风 	
Templar's Might	圣堂武士的力量 	
Tyrael's Might	泰瑞尔的力量 	
Alma Negra	阿尔玛·尼格拉 	
Hand of Blessed Light	祝福之光之手 	
Sandstorm Trek	沙暴之旅 	
The Fetid Sprinkler	恶臭散布者 	
Guardian Angel	守护天使 	
Heart Carver	刻心者 	
Ichorsting	灵液之刺 	
Eaglehorn	鹰号角 	
Langer Briser	兰格·布里瑟 	
Rockfleece	石之毛 	
Steelrend	碎钢 	
Windhammer	风之槌 	
Bonehew	破骨 	
Herald of Zakarum	撒卡兰姆使者 	
The Gnasher	牙齿 	
Husoldal Evo	胡索丹·依弗 	
Endlesshail	无休止的冰雹 	
Soulflay	剥皮灵魂 	
Bladebone	肩胛骨 	
Bing Sz Wang	兵之王 	
Shadowfang	影之牙 	
Ripsaw	粗齿大锯 	
Runemaster	符文大师 	
Blackhorn's Face	黑角面具 	
Swordguard	剑卫 	
Darkglow	扩散黑暗 	
Chance Guards	运气守护 	
Treads of Cthon	凯松的征服 	
Sparking Mail	火花之甲 	
Bverrit Keep	贝弗提的纪念 	
Medusa's Gaze	梅杜莎的凝视 	
Crow Caw	鸦鸣 	
Riphook	撕裂之钩 	
Horizon's Tornado	地平线的台风 	
Stormlash	暴风之结 	
Ravenlore	乌鸦之王 	
Baezil's Vortex	贝西尔的漩涡 	
Frostburn	霜燃 	
Stormshield	暴风之盾 	
Crown of Ages	年纪之冠 	
Coif of Glory	光荣布帽 	
Atma's Wail	亚特玛的哭喊 	
Sureshrill Frost	尖啸冰霜 	
Jalal's Mane	加尔的长发 	
Djinnslayer	魔灵杀手 	
Blood Crescent	血红新月 	
Gleamscythe	闪耀的镰刀 	
Jadetalon	碧玉爪 	
Coldsteel Eye	冰钢之眼 	
The Oculus	眼球 	
Boneshade	白骨阴影 	
Stealskull	偷取骷髅 	
Dracul's Grasp	卓古拉之握 	
Nosferatu's Coil	吸血圣王之圈 	
Souldrain	吸魂者 	
The Gladiator's Bane	斗士的祸根 	
Twitchthroe	抽动的挣扎 	
Nokozan Relic	诺科兰遗物 	
The Eye of Etlich	艾利屈之眼 	
The Mahim-Oak Curio	玛哈姆橡木古董 	
Saracen's Chance	萨拉森的机会 	
Crescent Moon	新月 	
The Cat's Eye	猫眼 	
Atma's Scarab	亚玛特的圣甲虫 	
The Rising Sun	旭日东升 	
Highlord's Wrath	大君之怒 	
Seraph's Hymn	炽天使之韵 	
Mara's Kaleidoscope	马拉的万花筒 	
Metalgrid	金属网格 	
Umbral Disk	阴影圆盘 	
Coldkill	冷杀 	
Stormspike	暴风尖刺 	
Venomsward	毒液牢房 	
Rusthandle	腐蚀的把手 	
Hexfire	六角之火 	
Darkforge Spawn	魔力肇生 	
Cerebus	地狱之吻 	
Arkaine's Valor	阿凯尼的荣耀 	
Demon's Arch	恶魔之王 	
Flamebellow	火焰号叫 	
Warshrike	战争之鸟 	
Lacerator	撕裂者 	
Valkiry Wing	女神之翼 	
Gargoyle's Bite	石像鬼之噬 	
Steel Carapice	钢铁铠甲 	
Ethereal Edge	永恒边界 	
The Centurion	百夫长 	
Bloodmoon	血月 	
Swordback Hold	剑背之架 	
Mosers Blessed Circle	摩西祝福之环 	
Blade of Ali Baba	阿里巴巴之刃 	
Blackoak Shield	黑橡树盾 	
Hellslayer	地狱毁灭者 	
Crainte Vomir	克林铁·弗姆 	
Lavagout	熔岩角羊 	
Snowclash	雪之冲突 	
Wartraveler	战争旅者 	
The Gavel of Pain	痛苦木槌 	
Cranebeak	鹤嘴 	
The Salamander	火精灵 	
Deathbit	死亡碎片 	
The Chieftan	族长 	
Stormrider	暴风骑士 	
Headstriker	击头者 	
Athena's Wrath	雅典娜的忿怒 	
Earthshaker	撼地者 	
Pierre Tombale Couant	皮尔·通把·考恩特 	
Peasent Crown	粗野之冠 	
Steelpillar	铁柱 	
Nord's Tenderizer	诺德的蚀肉药 	
Razoredge	刀锋边缘 	
The Diggler	迪格勒 	
The Battlebranch	战斗支系 	
Cliffkiller	岩壁杀手 	
Serpent Lord	海蛇之王 	
Woestave	烦恼诗集 	
Hellplague	地狱瘟疫 	
Blastbark	爆裂的吠叫 	
Ondal's Wisdom	安戴尔的智慧 	
The Dragon Chang	张龙 	
Spire of Honor	荣耀的尖塔 	
The Vile Husk	卑劣躯壳 	
Wizendraw	凋谢之画 	
Halaberd's Reign	海拉柏得的国度 	
Gloomstrap	阴影陷阱 	
Shaftstop	谢夫特斯坦布 	
Silkweave	纱织 	
Mang Song's Lesson	梅格之歌的教训 	
Goldwrap	金色包袱 	
Hellcast	投掷地狱 	
Bloodfist	血拳 	
Ghoulhide	食尸鬼外皮 	
Gorefoot	血脚 	
Arachnid Mesh	蜘蛛之网 	
Steeldriver	铁制大槌 	
Howltusk	怒号长牙 	
Brainhew	脑袋 	
The Patriarch	族长 	
Maelstromwrath	漩涡 	
The Generals Tan Do Li Ga	坦杜裡嘎将军	
Flame Rift	火焰裂隙	
Rotting Fissure	腐烂裂迹	
Amulet of the Viper	毒蛇护符	任务
Hell Forge Hammer	地狱熔炉铁锤	任务
Horadric Staff	赫拉迪克法杖	任务
KhalimFlail	克林姆的意志	任务
Staff of Kings	国王杖	任务
SuperKhalimFlail	克林姆的意志	任务
Darkfear	黑暗恐懼	任务
Giantmaimer	重殘	任务
Gore Ripper	血腥撕裂者	任务
Larzuk's Champion	拉苏克的斗士	任务
Merman's Speed	人鱼的齿轮	任务
Nethercrow	冥府乌鸦	任务
Odium	厌恶	任务
Sigurd's Staunch	席嘉德的隐藏	任务
Warriv's Warder	瓦瑞夫的令牌	任务
Zakarum's Salvation	撒卡兰姆的救赎	任务
`

// 💡 标准化名称：转小写，去标点，去The/Of，去空格
function normalizeName(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/['’]/g, '') // 去掉撇号
    .replace(/\b(the|of)\b/g, '') // 去掉虚词
    .replace(/[^a-z0-9]/g, '') // 去掉所有非字母数字
}

// 解析文本：生成 DeleteSet 和 TranslationMap
function parseRawText(text) {
  const map = {}
  const deleteSet = new Set()
  const deleteSetNormalized = new Set()

  const lines = text.split(/\r?\n/)
  lines.forEach(line => {
    line = line.trim()
    if (!line) return

    // 兼容 Tab 或 多个空格 分割
    const parts = line.split(/\t+| {2,}/)
    
    if (parts.length >= 2) {
      const enName = parts[0].trim()
      const zhName = parts[1].trim()
      
      // 检查是否是任务物品 (标记为"任务")
      const isTaskItem = (parts[2] && parts[2].includes('任务')) || line.includes('任务')
      
      if (isTaskItem) {
        deleteSet.add(enName)
        deleteSetNormalized.add(normalizeName(enName))
      } else {
        // 加入模糊匹配映射
        map[normalizeName(enName)] = zhName
      }
    }
  })
  return { map, deleteSet, deleteSetNormalized }
}

// 获取所有数据 (带分页)
async function getAllEquipmentTemplates() {
  const MAX_LIMIT = 1000
  const allTemplates = []
  let hasMore = true
  let skip = 0
  
  while (hasMore) {
    const result = await db.collection('equipment_templates')
      .field({ _id: true, name: true, name_en: true, name_zh: true, image: true })
      .skip(skip)
      .limit(MAX_LIMIT)
      .get()
    
    if (result.data.length > 0) {
      allTemplates.push(...result.data)
      skip += result.data.length
    } else {
      hasMore = false
    }
    if (skip >= 10000) break
  }
  return allTemplates
}

exports.main = async (event, context) => {
  try {
    console.log('开始执行装备数据清理与更新...')
    
    const { map: fuzzyMap, deleteSet, deleteSetNormalized } = parseRawText(rawTranslationText)
    console.log(`加载翻译表: ${Object.keys(fuzzyMap).length} 条, 待删除任务物品: ${deleteSet.size} 个`)

    // 1. 获取数据库中所有装备
    const equipmentTemplates = await getAllEquipmentTemplates()
    console.log(`数据库现有装备: ${equipmentTemplates.length} 条`)

    const deleteTasks = []
    const updateTasks = []
    const missingTranslations = [] // 记录仍未找到翻译的
    let skippedCount = 0

    // 2. 遍历判断：是删除、更新、还是跳过
    for (const template of equipmentTemplates) {
      // 优先取英文名
      const englishName = template.name_en || template.name || ''
      const normalizedDbName = normalizeName(englishName)

      // A. 检查是否需要删除 (任务物品)
      if (deleteSetNormalized.has(normalizedDbName)) {
        deleteTasks.push(template._id)
        continue
      }

      // B. 检查是否需要更新 (模糊匹配)
      const matchedZhName = fuzzyMap[normalizedDbName]
      
      if (matchedZhName) {
        const currentZh = template.name_zh
        const currentImage = template.image
        const newImagePath = `cloud://cloud1-7g43dval99d60dca.636c-cloud1-7g43dval99d60dca-1385676003/unique_image/${matchedZhName}.png`

        // 如果中文名不对，或者图片路径不对，则更新
        if (currentZh !== matchedZhName || !currentImage || !currentImage.includes(matchedZhName)) {
          updateTasks.push({
            id: template._id,
            data: {
              name_zh: matchedZhName,
              image: newImagePath
            },
            info: `${englishName} -> ${matchedZhName}`
          })
        } else {
          skippedCount++
        }
      } else {
        // 如果仍然没有翻译，且目前还是英文显示，记录下来
        if (!template.name_zh || template.name_zh === englishName) {
          missingTranslations.push({ id: template._id, name: englishName })
        }
        skippedCount++
      }
    }

    // 3. 执行批量删除
    console.log(`准备删除 ${deleteTasks.length} 条任务物品...`)
    if (deleteTasks.length > 0) {
      // 云开发 remove 不能批量传 ID 数组，只能 where({_id: _.in(...)})
      // 但为了稳妥，我们分批 remove
      const DELETE_BATCH = 50
      for (let i = 0; i < deleteTasks.length; i += DELETE_BATCH) {
        const idsToDelete = deleteTasks.slice(i, i + DELETE_BATCH)
        await db.collection('equipment_templates').where({
          _id: _.in(idsToDelete)
        }).remove()
      }
    }

    // 4. 执行批量更新
    console.log(`准备更新 ${updateTasks.length} 条装备数据...`)
    let updateSuccess = 0
    const UPDATE_BATCH = 20
    
    for (let i = 0; i < updateTasks.length; i += UPDATE_BATCH) {
      const batch = updateTasks.slice(i, i + UPDATE_BATCH)
      const promises = batch.map(task => 
        db.collection('equipment_templates').doc(task.id).update({ data: task.data })
          .then(() => 1).catch(() => 0)
      )
      const res = await Promise.all(promises)
      updateSuccess += res.reduce((a, b) => a + b, 0)
    }

    // 5. 尝试写入缺失文件 (本地调试用)
    if (missingTranslations.length > 0) {
      try {
        const missingPath = path.join(__dirname, 'missing_translations.json')
        fs.writeFileSync(missingPath, JSON.stringify(missingTranslations, null, 2), 'utf-8')
      } catch (e) {}
    }

    return {
      success: true,
      deleted: deleteTasks.length,
      updated: updateSuccess,
      skipped: skippedCount,
      missingCount: missingTranslations.length,
      missingList: missingTranslations
    }

  } catch (error) {
    console.error('执行错误:', error)
    return { success: false, error: error.message }
  }
}