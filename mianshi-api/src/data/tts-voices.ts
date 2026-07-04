export type TtsVoice = {
  id: string
  label: string
  category: '推荐' | '明星IP' | '角色' | '情感' | '通用'
  resourceId: 'seed-tts-2.0' | 'seed-tts-1.0'
  recommended?: boolean
}

/** 豆包语音合成音色（需在火山引擎控制台开通对应音色） */
export const DOUBAO_VOICES: TtsVoice[] = [
  // 豆包 2.0 推荐
  {
    id: 'zh_female_vv_uranus_bigtts',
    label: 'Vivi 2.0 · 知性女声',
    category: '推荐',
    resourceId: 'seed-tts-2.0',
    recommended: true,
  },
  {
    id: 'zh_female_cancan_uranus_bigtts',
    label: '灿灿 2.0 · 知性自然',
    category: '推荐',
    resourceId: 'seed-tts-2.0',
    recommended: true,
  },
  {
    id: 'zh_female_xiaohe_uranus_bigtts',
    label: '小何 2.0 · 温柔女声',
    category: '推荐',
    resourceId: 'seed-tts-2.0',
  },
  {
    id: 'zh_male_taocheng_uranus_bigtts',
    label: '天成 2.0 · 专业男声',
    category: '推荐',
    resourceId: 'seed-tts-2.0',
  },
  {
    id: 'zh_female_kefunvsheng_uranus_bigtts',
    label: '暖阳女声 · 亲切客服',
    category: '通用',
    resourceId: 'seed-tts-2.0',
  },
  // 明星 / IP 仿音（豆包 1.0）
  {
    id: 'zh_female_yangmi_mars_bigtts',
    label: '林潇 · 甜美女声',
    category: '明星IP',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_female_linzhiling_mars_bigtts',
    label: '玲玲姐姐 · 温柔御姐',
    category: '明星IP',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_female_naying_mars_bigtts',
    label: '那姐 · 大气女声',
    category: '明星IP',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_male_zhoujielun_emo_v2_mars_bigtts',
    label: '周董 · 说唱风格',
    category: '明星IP',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_male_jingqiangkanye_emo_mars_bigtts',
    label: '京腔侃爷 · 幽默男声',
    category: '明星IP',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_female_jiyejizi2_mars_bigtts',
    label: '春日部姐姐 · 元气少女',
    category: '明星IP',
    resourceId: 'seed-tts-1.0',
  },
  // 角色扮演
  {
    id: 'zh_male_sunwukong_uranus_bigtts',
    label: '猴哥 2.0 · 孙悟空',
    category: '角色',
    resourceId: 'seed-tts-2.0',
  },
  {
    id: 'zh_female_peiqi_uranus_bigtts',
    label: '佩奇猪 2.0',
    category: '角色',
    resourceId: 'seed-tts-2.0',
  },
  {
    id: 'zh_male_tangseng_mars_bigtts',
    label: '唐僧 · IP 仿音',
    category: '角色',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_male_zhubajie_mars_bigtts',
    label: '猪八戒 · IP 仿音',
    category: '角色',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_male_lubanqihao_mars_bigtts',
    label: '鲁班七号 · 游戏角色',
    category: '角色',
    resourceId: 'seed-tts-1.0',
  },
  // 多情感
  {
    id: 'zh_female_gaolengyujie_emo_v2_mars_bigtts',
    label: '高冷御姐 · 多情感',
    category: '情感',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_male_yourougongzi_emo_v2_mars_bigtts',
    label: '优柔公子 · 多情感',
    category: '情感',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_female_meilinvyou_emo_v2_mars_bigtts',
    label: '魅力女友 · 多情感',
    category: '情感',
    resourceId: 'seed-tts-1.0',
  },
  {
    id: 'zh_male_yangguangqingnian_emo_v2_mars_bigtts',
    label: '阳光青年 · 多情感',
    category: '情感',
    resourceId: 'seed-tts-1.0',
  },
]

export function findDoubaoVoice(id: string): TtsVoice | undefined {
  return DOUBAO_VOICES.find((v) => v.id === id)
}
