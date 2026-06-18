import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Select, Button, message, Typography,
  Space, Tag, Divider, Row, Col, Alert,
  Table, Upload, Modal, Steps, Progress, Statistic,
  Drawer, List, Avatar, Empty, Tooltip, Popconfirm, Badge,
} from 'antd';
import {
  SaveOutlined, CloudOutlined, RobotOutlined, ApiOutlined,
  PhoneOutlined, SettingOutlined, SoundOutlined, DatabaseOutlined,
  ShopOutlined, GlobalOutlined, CheckCircleOutlined, CloseCircleOutlined,
  PlusOutlined, UploadOutlined, DeleteOutlined, PlayCircleOutlined,
 ReloadOutlined, InfoCircleOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '../utils/api';
import type { UploadProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 配置状态统计
interface ConfigStats {
  siteName: string;
  callCenterConfigured: number;
  aiConfigured: number;
  courierConfigured: number;
  voiceEnabled: boolean;
  dbConnected: boolean;
}

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [providers, setProviders] = useState<any>({ callCenter: [], ai: [], couriers: [], database: {} });
  const [couriers, setCouriers] = useState<any[]>([]);
  const [stats, setStats] = useState<ConfigStats>({
    siteName: '杭州喵喵至家网络有限公司',
    callCenterConfigured: 0,
    aiConfigured: 0,
    courierConfigured: 0,
    voiceEnabled: false,
    dbConnected: true,
  });

  // 音色管理状态
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceProjects, setVoiceProjects] = useState<any[]>([]);
  const [voiceModels, setVoiceModels] = useState<any[]>([]);
  const [voiceDeployments, setVoiceDeployments] = useState<any[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<any>({});
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createProjectForm] = Form.useForm();
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);

  const callCenterItems = providers.callCenter || [];
  const aiItems = providers.ai || [];

  // 音色管理函数（必须在 useEffect 之前定义）
  const loadVoiceData = async () => {
    try {
      const [configRes, projectsRes, modelsRes, deploymentsRes] = await Promise.all([
        api.get('/voice/config').catch(() => ({ data: {} })),
        api.get('/voice/projects').catch(() => ({ data: [] })),
        api.get('/voice/models').catch(() => ({ data: [] })),
        api.get('/voice/deployments').catch(() => ({ data: [] })),
      ]);
      setVoiceConfig(configRes.data || {});
      setVoiceProjects(projectsRes.data?.projects || []);
      setVoiceModels(modelsRes.data?.models || []);
      setVoiceDeployments(deploymentsRes.data?.deployments || []);
    } catch (err) {
      console.error('加载音色数据失败', err);
    }
  };

  const loadProjectSamples = async (projectId: string) => {
    try {
      await api.get(`/voice/samples/${projectId}`).catch(() => ({}));
      message.info('样本加载功能开发中');
    } catch (err) {
      console.error('加载样本失败', err);
    }
  };

  const openVoiceModal = async () => {
    setVoiceModalOpen(true);
    await loadVoiceData();
  };

  const activateVoice = async (deployment: any) => {
    try {
      await api.post('/voice/save-config', {
        endpointUrl: deployment.endpointUrl,
        apiKey: '',
        voiceName: deployment.name,
        modelId: deployment.modelId,
      });
      message.success(`已启用音色「${deployment.name}」，AI通话将使用此音色`);
      setVoiceModalOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.error || '启用失败');
    }
  };

  const uploadProps: UploadProps = {
    name: 'audioFile',
    action: '/api/voice/samples/upload',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    accept: '.wav,.mp3,.flac,.ogg',
    beforeUpload: (file) => {
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) { message.error('文件大小不能超过 50MB'); return false; }
      return true;
    },
    onChange: (info) => {
      if (info.file.status === 'done') message.success(`${info.file.name} 上传成功`);
      else if (info.file.status === 'error') message.error(`${info.file.name} 上传失败`);
    },
  };

  useEffect(() => {
    Promise.all([
      api.get('/configs/providers').catch(() => ({ data: { callCenter: [], ai: [], couriers: [], database: {} } })),
      api.get('/configs').catch(() => []),
      api.get('/couriers/list').catch(() => ({ data: [] })),
    ]).then(([provRes, cfgRes, curRes]) => {
      setProviders(provRes.data || { callCenter: [], ai: [], couriers: [], database: {} });
      setCouriers(curRes.data || []);
      const items = cfgRes.data || [];
      const obj: any = {};
      items.forEach((c: any) => { obj[c.key] = c.value; });
      form.setFieldsValue(obj);

      // 更新统计
      const prov = provRes.data || {};
      const callItems = prov.callCenter || [];
      const aiItems = prov.ai || [];
      const courierItems = prov.couriers || [];
      setStats({
        siteName: obj['site.name'] || '杭州喵喵至家网络有限公司',
        callCenterConfigured: callItems.filter((p: any) => p.available).length,
        aiConfigured: aiItems.filter((p: any) => p.available).length,
        courierConfigured: courierItems.filter((c: any) => c.available).length,
        voiceEnabled: voiceConfig.isEnabled || false,
        dbConnected: !!(prov.database && prov.database.dialect),
      });
    });
    loadVoiceData();
  }, [form]);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const items = Object.keys(values).map(k => ({ key: k, value: String(values[k] ?? '') }));
      const res = await api.post('/configs/batch', { items });
      message.success(res.data?.message || '配置保存成功');
    } catch (err: any) {
      message.error(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>⚙️ 系统设置</Title>
          <Text type="secondary">配置呼叫中心、AI模型、快递API和客服音色等核心服务</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { form.submit(); }}>刷新</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => form.submit()} size="large">
            保存全部配置
          </Button>
        </Space>
      </div>

      {/* 系统提示 */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16, borderRadius: 8 }}
        message={
          <span>
            已集成 Azure · 容联云 · 华为云 · 通义千问 · 智谱 AI · 快递鸟 · 菜鸟 · 申通官方接口。
            配置真实 API 密钥后自动启用，未配置时系统使用模拟数据运行。
          </span>
        }
      />

      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8, background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}>
            <Statistic
              title={<span style={{ color: '#1890ff' }}><ShopOutlined /> 网点名称</span>}
              value={stats.siteName.length > 6 ? stats.siteName.substring(0, 6) + '...' : stats.siteName}
              valueStyle={{ fontSize: 13, color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8, background: stats.callCenterConfigured > 0 ? 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)' : 'linear-gradient(135deg, #fff7e6 0%, #ffe58f 100%)', border: 'none' }}>
            <Statistic
              title={<span style={{ color: stats.callCenterConfigured > 0 ? '#52c41a' : '#fa8c16' }}><PhoneOutlined /> 呼叫中心</span>}
              value={`${stats.callCenterConfigured} / ${callCenterItems.length}`}
              suffix="已配置"
              valueStyle={{ fontSize: 16, color: stats.callCenterConfigured > 0 ? '#52c41a' : '#fa8c16', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8, background: stats.aiConfigured > 0 ? 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)' : 'linear-gradient(135deg, #fff7e6 0%, #ffe58f 100%)', border: 'none' }}>
            <Statistic
              title={<span style={{ color: stats.aiConfigured > 0 ? '#52c41a' : '#fa8c16' }}><RobotOutlined /> AI模型</span>}
              value={`${stats.aiConfigured} / ${aiItems.length}`}
              suffix="已启用"
              valueStyle={{ fontSize: 16, color: stats.aiConfigured > 0 ? '#52c41a' : '#fa8c16', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8, background: stats.courierConfigured > 0 ? 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)' : 'linear-gradient(135deg, #fff7e6 0%, #ffe58f 100%)', border: 'none' }}>
            <Statistic
              title={<span style={{ color: stats.courierConfigured > 0 ? '#52c41a' : '#fa8c16' }}><ApiOutlined /> 快递API</span>}
              value={`${stats.courierConfigured} / 3`}
              suffix="已配置"
              valueStyle={{ fontSize: 16, color: stats.courierConfigured > 0 ? '#52c41a' : '#fa8c16', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8, background: stats.voiceEnabled ? 'linear-gradient(135deg, #e6fffb 0%, #87e8de 100%)' : 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}>
            <Statistic
              title={<span style={{ color: stats.voiceEnabled ? '#13c2c2' : '#722ed1' }}><SoundOutlined /> 音色定制</span>}
              value={stats.voiceEnabled ? '已启用' : '默认音色'}
              valueStyle={{ fontSize: 14, color: stats.voiceEnabled ? '#13c2c2' : '#722ed1', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 8, background: stats.dbConnected ? 'linear-gradient(135deg, #e6f7ff 0%, #91d5ff 100%)' : 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)', border: 'none' }}>
            <Statistic
              title={<span style={{ color: stats.dbConnected ? '#1890ff' : '#ff4d4f' }}><DatabaseOutlined /> 数据库</span>}
              value={stats.dbConnected ? 'MySQL 已连接' : '未连接'}
              valueStyle={{ fontSize: 13, color: stats.dbConnected ? '#1890ff' : '#ff4d4f', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        {/* 第一行：站点信息 + 呼叫中心 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={<Space><ShopOutlined style={{ color: '#1890ff' }} /> <Text strong>站点信息</Text></Space>}
              style={{ borderRadius: 8 }}
              extra={<Tag color="blue">{stats.siteName}</Tag>}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="site.name" label="网点名称" initialValue="杭州喵喵至家网络有限公司">
                    <Input placeholder="请输入网点名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="ticket.sla.minutes" label="工单默认 SLA（分钟）" initialValue="240">
                    <Input type="number" placeholder="240" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              size="small"
              title={<Space><PhoneOutlined style={{ color: '#fa8c16' }} /> <Text strong>呼叫中心服务</Text></Space>}
              extra={
                <Space>
                  {callCenterItems.filter((p: any) => p.available).length > 0 ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">{callCenterItems.filter((p: any) => p.available).length}个已启用</Tag>
                  ) : (
                    <Tag icon={<InfoCircleOutlined />} color="warning">使用模拟模式</Tag>
                  )}
                </Space>
              }
              style={{ borderRadius: 8 }}
            >
              <Form.Item name="call.center.provider" label="默认服务商" initialValue="mock">
                <Select placeholder="选择默认呼叫服务商">
                  {callCenterItems.map((p: any) => (
                    <Option key={p.id} value={p.id}>{p.name} {p.available ? '✅' : ''}</Option>
                  ))}
                </Select>
              </Form.Item>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {callCenterItems.map((p: any) => (
                  <Tag
                    key={p.id}
                    icon={p.available ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    color={p.available ? 'success' : 'default'}
                    style={{ padding: '4px 8px', borderRadius: 12 }}
                  >
                    {p.name}
                  </Tag>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 第二行：AI模型 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              title={<Space><RobotOutlined style={{ color: '#722ed1' }} /> <Text strong>AI 模型 & 对话引擎</Text></Space>}
              extra={
                <Space>
                  {aiItems.filter((p: any) => p.available).length > 0 ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">{aiItems.filter((p: any) => p.available).length}个已启用</Tag>
                  ) : (
                    <Tag icon={<InfoCircleOutlined />} color="warning">使用本地规则引擎</Tag>
                  )}
                </Space>
              }
              style={{ borderRadius: 8 }}
            >
              <Row gutter={16}>
                {aiItems.map((p: any) => (
                  <Col xs={24} md={12} key={p.id}>
                    <Card
                      size="small"
                      style={{
                        marginBottom: 12,
                        borderColor: p.available ? '#b7eb8f' : '#d9d9d9',
                        background: p.available ? '#fafff0' : '#fafafa',
                        borderRadius: 8,
                      }}
                      title={
                        <Space>
                          <Badge status={p.available ? 'success' : 'default'} />
                          <Text strong>{p.name}</Text>
                          <Tag color={p.available ? 'green' : 'default'} style={{ marginLeft: 'auto' }}>
                            {p.available ? '已启用' : '未配置'}
                          </Tag>
                        </Space>
                      }
                    >
                      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                        {p.id === 'azure' && '微软 Azure OpenAI：GPT-4 / GPT-4o 模型，企业级 AI 对话。'}
                        {p.id === 'qwen' && '通义千问（阿里云 DashScope）：国产大模型，客服场景效果优秀。'}
                        {p.id === 'zhipu' && '智谱 AI（GLM-4）：国产对话大模型，稳定可靠。'}
                        {p.id === 'local' && '本地规则引擎：无需 API 密钥，基于规则库自动回复。'}
                      </Paragraph>
                      {p.id === 'azure' && (
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="azure.openAiEndpoint" label="OpenAI 端点" initialValue="">
                              <Input.Password placeholder="https://xxx.openai.azure.com" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="azure.openAiApiKey" label="API Key" initialValue="">
                              <Input.Password placeholder="请输入 Azure OpenAI API Key" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}
                      {p.id === 'qwen' && (
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="dashscope.apiKey" label="DashScope API Key" initialValue="">
                              <Input.Password placeholder="请输入通义千问 API Key（sk-xxx）" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="dashscope.model" label="模型名称" initialValue="qwen-plus">
                              <Input.Password placeholder="qwen-plus / qwen-turbo" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}
                      {p.id === 'zhipu' && (
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="zhipu.apiKey" label="智谱 API Key" initialValue="">
                              <Input.Password placeholder="请输入智谱 AI API Key" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="zhipu.model" label="模型名称" initialValue="glm-4">
                              <Input.Password placeholder="glm-4 / glm-4-flash" />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
              <Divider style={{ margin: '8px 0' }} />
              <Form.Item name="ai.provider" label="默认 AI 服务商" initialValue="local">
                <Select placeholder="选择默认 AI 服务商">
                  {aiItems.map((p: any) => (
                    <Option key={p.id} value={p.id}>{p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {/* 第三行：快递API */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              title={<Space><ApiOutlined style={{ color: '#52c41a' }} /> <Text strong>快递物流 API</Text></Space>}
              style={{ borderRadius: 8 }}
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="kuaidibird.bizId" label="快递鸟商户 ID">
                    <Input.Password placeholder="请输入快递鸟商户 ID（E-Business ID）" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="kuaidibird.apiKey" label="快递鸟 API Key">
                    <Input.Password placeholder="请输入快递鸟 API Key" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="cainiao.appKey" label="菜鸟 AppKey">
                    <Input.Password placeholder="请输入菜鸟 AppKey" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="cainiao.secret" label="菜鸟 Secret">
                    <Input.Password placeholder="请输入菜鸟 Secret" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="sto.appKey" label="申通 AppKey">
                    <Input.Password placeholder="请输入申通开放平台 AppKey" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="sto.appSecret" label="申通 AppSecret">
                    <Input.Password placeholder="请输入申通开放平台 AppSecret" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="sto.warehouseCode" label="申通网点仓库编码">
                    <Input.Password placeholder="申通网点管家仓库编码" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item name="sto.apiBase" label="申通 API 地址" initialValue="https://open.sto.cn">
                    <Input.Password placeholder="申通开放平台 API 地址" />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <Space wrap>
                <Text type="secondary">服务状态：</Text>
                <Tag color={providers.couriers?.some((c: any) => c.id === 'kuaidibird') ? 'success' : 'default'}>
                  快递鸟 {providers.couriers?.some((c: any) => c.id === 'kuaidibird') ? '已配置' : '未配置'}
                </Tag>
                <Tag color={providers.couriers?.some((c: any) => c.id === 'cainiao') ? 'success' : 'default'}>
                  菜鸟 {providers.couriers?.some((c: any) => c.id === 'cainiao') ? '已配置' : '未配置'}
                </Tag>
                <Tag color={providers.couriers?.some((c: any) => c.id === 'sto') ? 'success' : 'default'}>
                  申通 {providers.couriers?.some((c: any) => c.id === 'sto') ? '已配置' : '未配置'}
                </Tag>
                <Tag color="blue">
                  <DatabaseOutlined /> {providers.database?.dialect} · {providers.database?.host}/{providers.database?.name}
                </Tag>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 第四行：呼叫中心详细配置 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              title={<Space><CloudOutlined style={{ color: '#1890ff' }} /> <Text strong>呼叫中心详细配置</Text></Space>}
              style={{ borderRadius: 8 }}
            >
              <Row gutter={16}>
                {callCenterItems.map((p: any) => (
                  <Col xs={24} md={12} key={p.id}>
                    {p.id === 'azure' && (
                      <Card
                        size="small"
                        style={{
                          marginBottom: 12,
                          borderColor: p.available ? '#b7eb8f' : '#d9d9d9',
                          background: p.available ? '#fafff0' : '#fafafa',
                          borderRadius: 8,
                        }}
                        title={
                          <Space>
                            <Badge status={p.available ? 'success' : 'default'} />
                            <Text strong>Azure Communication Services</Text>
                            <Tag color={p.available ? 'green' : 'default'} style={{ marginLeft: 'auto' }}>
                              {p.available ? '已启用' : '未配置'}
                            </Tag>
                          </Space>
                        }
                      >
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="azure.acsConnectionString" label="ACS 连接字符串" initialValue="">
                              <Input.Password placeholder="DefaultEndpointsProtocol=..." />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="azure.acsPhoneNumber" label="ACS 外呼号码" initialValue="">
                              <Input.Password placeholder="+86xxxxxxxxxxx" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="azure.openAiDeployment" label="OpenAI Deployment" initialValue="">
                              <Input.Password placeholder="gpt-4" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="azure.speechKey" label="Speech 密钥" initialValue="">
                              <Input.Password placeholder="Azure Speech Service 密钥" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="azure.speechRegion" label="Speech 区域" initialValue="eastasia">
                          <Input.Password placeholder="eastus" />
                        </Form.Item>
                      </Card>
                    )}
                    {p.id === 'ronglian' && (
                      <Card
                        size="small"
                        style={{ marginBottom: 12, borderColor: '#d9d9d9', background: '#fafafa', borderRadius: 8 }}
                        title={<Space><Badge status={p.available ? 'success' : 'default'} /><Text strong>容联云通讯</Text></Space>}
                      >
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="ronglian.accountSid" label="Account SID" initialValue="">
                              <Input.Password placeholder="请输入容联 Account SID" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="ronglian.accountToken" label="Account Token" initialValue="">
                              <Input.Password placeholder="请输入容联 Account Token" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    )}
                    {p.id === 'huawei' && (
                      <Card
                        size="small"
                        style={{ marginBottom: 12, borderColor: '#d9d9d9', background: '#fafafa', borderRadius: 8 }}
                        title={<Space><Badge status={p.available ? 'success' : 'default'} /><Text strong>华为云联络中心</Text></Space>}
                      >
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="huawei.appKey" label="App Key" initialValue="">
                              <Input.Password placeholder="请输入华为 App Key" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="huawei.appSecret" label="App Secret" initialValue="">
                              <Input.Password placeholder="请输入华为 App Secret" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    )}
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 第五行：客服音色定制 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              size="small"
              title={
                <Space>
                  <SoundOutlined style={{ color: '#13c2c2' }} />
                  <Text strong>🎤 客服音色定制</Text>
                  <Tag color={voiceConfig.isEnabled ? 'cyan' : 'purple'}>
                    {voiceConfig.isEnabled ? '已启用自定义音色' : '使用 Azure 默认音色'}
                  </Tag>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  onClick={() => openVoiceModal()}
                  style={{ borderRadius: 8 }}
                >
                  {voiceConfig.isEnabled ? '管理音色' : '配置音色'}
                </Button>
              }
              style={{ borderRadius: 8 }}
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Card size="small" style={{ background: '#f5f5f5', borderRadius: 6 }}>
                    <Statistic
                      title="当前音色"
                      value={voiceConfig.voiceName || 'xiaoxiao (默认晓晓女声)'}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" style={{ background: '#f5f5f5', borderRadius: 6 }}>
                    <Statistic
                      title="音色项目"
                      value={voiceProjects.length}
                      suffix="个"
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" style={{ background: '#f5f5f5', borderRadius: 6 }}>
                    <Statistic
                      title="已部署模型"
                      value={voiceDeployments.length}
                      suffix="个"
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Card>
                </Col>
              </Row>
              <Alert
                style={{ marginTop: 12, borderRadius: 6 }}
                message={
                  voiceConfig.isEnabled
                    ? '✅ 已启用自定义音色，AI通话将使用您定制的声音'
                    : 'ℹ️ 使用 Azure 默认音色（晓晓 Neural），点击"配置音色"可定制真人采样音色'
                }
                type={voiceConfig.isEnabled ? 'success' : 'info'}
                showIcon
              />
            </Card>
          </Col>
        </Row>
      </Form>

      {/* 音色管理Modal */}
      <Modal
        open={voiceModalOpen}
        onCancel={() => setVoiceModalOpen(false)}
        width={900}
        footer={null}
        title="🎤 客服音色定制（Azure Custom Neural Voice）"
        styles={{ body: { paddingTop: 8 } }}
        style={{ top: 40 }}
      >
        <Alert
          message="Azure Custom Neural Voice 让您可以使用真人录音样本训练专属客服音色，提供更自然的语音交互体验。建议录音素材 20+ 小时，训练时间约 6-24 小时。"
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <Steps
          current={voiceConfig.isEnabled ? 3 : 0}
          items={[
            { title: '创建项目', description: '建立音色项目', icon: <PlusOutlined /> },
            { title: '上传录音', description: '上传真人样本', icon: <UploadOutlined /> },
            { title: '训练模型', description: 'AI学习音色', icon: <RobotOutlined /> },
            { title: '部署使用', description: '启用音色', icon: <CheckCircleOutlined /> },
          ]}
          style={{ marginBottom: 20 }}
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              title={<Space><PlusOutlined style={{ color: '#1890ff' }} />音色项目</Space>}
              size="small"
              extra={<Button size="small" type="primary" onClick={() => setCreateProjectOpen(true)}>新建项目</Button>}
              style={{ borderRadius: 8 }}
            >
              {voiceProjects.length === 0 ? (
                <Empty description="暂无音色项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  size="small"
                  dataSource={voiceProjects}
                  renderItem={(item: any) => (
                    <List.Item
                      style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 6 }}
                      onClick={() => { setSelectedProject(item); loadProjectSamples(item.id); }}
                    >
                      <List.Item.Meta
                        avatar={<Avatar size="small" style={{ backgroundColor: '#1890ff' }} icon={<SoundOutlined />} />}
                        title={item.name}
                        description={<Tag size="small" color={item.status === 'Succeeded' ? 'success' : 'warning'}>{item.status}</Tag>}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              title={<Space><RobotOutlined style={{ color: '#722ed1' }} />训练模型</Space>}
              size="small"
              extra={<Button size="small" type="primary" disabled={!selectedProject} onClick={() => setTrainingModalOpen(true)}>开始训练</Button>}
              style={{ borderRadius: 8 }}
            >
              {voiceModels.length === 0 ? (
                <Empty description="暂无训练模型，需先上传录音样本" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  size="small"
                  dataSource={voiceModels}
                  renderItem={(item: any) => (
                    <List.Item style={{ padding: '8px 12px', borderRadius: 6 }}>
                      <List.Item.Meta
                        avatar={<Avatar size="small" style={{ backgroundColor: '#722ed1' }} icon={<RobotOutlined />} />}
                        title={item.name}
                        description={
                          <Space>
                            <Tag size="small" color={item.status === 'Succeeded' ? 'success' : item.status === 'Running' ? 'processing' : 'default'}>
                              {item.status === 'Running' ? '训练中' : item.status === 'Succeeded' ? '完成' : '待训练'}
                            </Tag>
                            {item.trainingProgress > 0 && <Progress percent={item.trainingProgress} size="small" style={{ width: 80 }} />}
                          </Space>
                        }
                      />
                      {item.status === 'Succeeded' && (
                        <Button size="small" type="link" onClick={() => { setSelectedModel(item); setDeployModalOpen(true); }}>部署</Button>
                      )}
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>

        <Card
          title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} />已部署音色</Space>}
          size="small"
          style={{ marginTop: 16, borderRadius: 8 }}
        >
          {voiceDeployments.length === 0 ? (
            <Empty description="暂无已部署音色，训练完成后请部署使用" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              size="small"
              dataSource={voiceDeployments}
              renderItem={(item: any) => (
                <List.Item
                  style={{ padding: '10px 12px', borderRadius: 6 }}
                  actions={[
                    item.status === 'Succeeded' ? (
                      <Button size="small" type="primary" onClick={() => activateVoice(item)}>启用此音色</Button>
                    ) : (
                      <Tag size="small" color="warning">部署中</Tag>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar size="small" style={{ backgroundColor: '#52c41a' }} icon={<SoundOutlined />} />}
                    title={
                      <Space>
                        {item.name}
                        <Tag size="small" color={item.status === 'Succeeded' ? 'success' : 'warning'}>
                          {item.status === 'Succeeded' ? '运行中' : '部署中'}
                        </Tag>
                      </Space>
                    }
                    description={item.endpointUrl ? <Text type="secondary" style={{ fontSize: 11 }} ellipsis={{ tooltip: item.endpointUrl }}>{item.endpointUrl}</Text> : undefined}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Modal>

      {/* 新建项目Modal */}
      <Modal
        open={createProjectOpen}
        onCancel={() => { setCreateProjectOpen(false); createProjectForm.resetFields(); }}
        title="📁 创建音色项目"
        onOk={() => {
          createProjectForm.validateFields().then(async (values) => {
            try {
              await api.post('/voice/projects', values);
              message.success('项目创建成功');
              setCreateProjectOpen(false);
              createProjectForm.resetFields();
              loadVoiceData();
            } catch (err: any) { message.error(err.response?.data?.error || '创建失败'); }
          });
        }}
        okText="创建"
      >
        <Form form={createProjectForm} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例如：客服小姐姐音色" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <TextArea placeholder="描述此音色的用途..." rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="locale" label="语言" initialValue="zh-CN">
                <Select>
                  <Option value="zh-CN">中文（简体）</Option>
                  <Option value="zh-TW">中文（繁体）</Option>
                  <Option value="en-US">英文</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="性别" initialValue="Female">
                <Select>
                  <Option value="Female">女声</Option>
                  <Option value="Male">男声</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 训练模型Modal */}
      <Modal
        open={trainingModalOpen}
        onCancel={() => setTrainingModalOpen(false)}
        title="🤖 开始训练模型"
        onOk={() => {
          if (!selectedProject) return;
          const modelName = `${selectedProject.name}-模型-${Date.now()}`;
          api.post('/voice/models/train', { projectId: selectedProject.id, modelName }).then(() => {
            message.success('训练任务已提交，请耐心等待...');
            setTrainingModalOpen(false);
            loadVoiceData();
          }).catch((err) => { message.error(err.response?.data?.error || '提交失败'); });
        }}
        okText="确认训练"
      >
        <Alert message="训练模型需要满足以下条件：录音样本至少 20+ 小时，且质量合格。训练时间约需 6-24 小时。" type="warning" showIcon style={{ marginBottom: 16 }} />
        <Text>确定要为项目「{selectedProject?.name}」创建训练任务吗？</Text>
      </Modal>

      {/* 部署模型Modal */}
      <Modal
        open={deployModalOpen}
        onCancel={() => setDeployModalOpen(false)}
        title="🚀 部署音色模型"
        onOk={() => {
          if (!selectedModel) return;
          const endpointName = `voice-${Date.now()}`;
          api.post('/voice/deployments', { modelId: selectedModel.id, endpointName }).then(() => {
            message.success('部署任务已提交，请等待部署完成...');
            setDeployModalOpen(false);
            loadVoiceData();
          }).catch((err) => { message.error(err.response?.data?.error || '部署失败'); });
        }}
        okText="确认部署"
      >
        <Alert message="部署模型后会获得一个 API 端点地址，可用于语音合成。" type="info" showIcon style={{ marginBottom: 16 }} />
        <Text>确定要部署模型「{selectedModel?.name}」吗？</Text>
      </Modal>
    </div>
  );
}
