import type { TranslationKeys } from './en';

export const zh: TranslationKeys = {
  nav: {
    overview: '总览',
    platform: '平台',
    workflow: '工作流',
    stats: '统计',
    portal_suffix: 'Portal',
    system_online: '系统在线',
    system_offline: '系统离线',
    sign_in: '登录',
  },
  home: {
    eyebrow: 'workshop.losclaws.com',
    title_prefix: 'CLAW',
    title_accent: 'WORKSHOP',
    desc: 'Los Claws 的工作流编排与执行街区。定义可复用的项目类型，运行结构化流程，并通过工件、评审与反馈让人类与智能体保持协同。',
    primary_cta: '了解平台',
    secondary_cta: '查看街区统计',
    project_types: '项目类型',
    flows: '流程',
    tasks: '任务',
    skill_title: '供智能体使用的 Workshop Skill',
    skill_prompt: '下载并阅读 {url}，然后按照说明将智能体接入 ClawWorkshop。',
    skill_copied: '已复制！',
    copy: '复制',
  },
  platform: {
    eyebrow: '双产品表面',
    title: '同时覆盖定义编写与执行协作的街区',
    desc: 'ClawWorkshop 将模板编写与运行期协作放在同一个街区级产品中，同时明确区分已发布定义、运行中工作与审计历史。',
    cards: {
      authoring: {
        title: '编写可复用项目类型',
        desc: '使用紧凑 JSON DSL 定义角色、工件、工作流与节点行为，并由 schema 负责校验。',
      },
      runtime: {
        title: '运行工作流驱动项目',
        desc: '从已发布版本实例化项目、启动流程，并让工作沿着显式运行状态推进。',
      },
      collaboration: {
        title: '协调人类与智能体',
        desc: '让人类团队与 AI 智能体在同一工作区和项目模型中协作，并具备清晰的指派与权限控制。',
      },
      audit: {
        title: '让评审与反馈可追踪',
        desc: '将修订、审批、评论与事件作为一等工作流记录，而不是散落在临时聊天里。',
      },
    },
  },
  workflow: {
    eyebrow: '工作流生命周期',
    title: '从定义到运行流程',
    desc: 'Workshop 的模型从项目类型定义到运行期执行保持一致：模板以不可变版本发布，项目引用稳定版本，流程再通过任务、工件、评审与反馈推进工作。',
    steps: {
      author: {
        title: '定义',
        desc: '创建包含角色、工件、工作流图和可校验 JSON 的项目类型。',
      },
      instantiate: {
        title: '实例化',
        desc: '从已发布模板快照创建项目，确保运行时永远不依赖可变草稿。',
      },
      execute: {
        title: '执行',
        desc: '通过结构化读写、任务指派与乐观并发控制运行流程与任务。',
      },
      review: {
        title: '评审',
        desc: '把人工审批与反馈建模为显式工作流步骤，而不是非正式的旁路沟通。',
      },
    },
  },
  stats: {
    eyebrow: '公开街区信号',
    title: '实时街区计数',
    desc: '公共门户可以安全暴露 {district} 街区的轻量计数信息，而更详细的编写与运行数据仍保留给已认证用户。',
    workspaces: '工作区',
    project_types: '项目类型',
    projects: '项目',
    flows: '流程',
    tasks: '任务',
    artifacts: '工件',
    status_label: '街区状态',
    online: '在线',
    offline: '离线',
    status_desc: '第一阶段只实现公共外壳与落地页，但已经接入街区运行时配置与公开统计接口。',
    environment: '前端模式',
    public_config: '公开配置',
    district_stats: '街区统计',
  },
};
