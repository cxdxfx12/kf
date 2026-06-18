import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, Input, Button, List, Tag, Typography, Divider, Space, Modal, Spin, Switch, Tooltip } from 'antd';
import { SearchOutlined, ArrowRightOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export default function KnowledgeFloatingBot() {
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 200 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const botRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 70, e.clientX - dragOffset.x)),
        y: Math.max(10, Math.min(window.innerHeight - 70, e.clientY - dragOffset.y))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    api.get('/knowledge/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (botRef.current) {
      const rect = botRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const fetchResults = useCallback(async (q: string, category: string = '') => {
    setLoading(true);
    setAiAnswer('');
    setAiSource('');
    try {
      let url = '/knowledge/search';
      let params: any = { q };
      if (category) {
        url = '/knowledge/category/' + encodeURIComponent(category);
        params = {};
      }
      const res = await api.get(url, { params });
      setResults(res.data.results || []);

      if (!category && q && useAI && (res.data.results || []).length === 0) {
        setAiLoading(true);
        try {
          const aiRes = await api.post('/knowledge/ask', { question: q, useAI: true });
          setAiAnswer(aiRes.data.aiAnswer || '');
          setAiSource(aiRes.data.aiSource || '');
        } catch {
          setAiAnswer('');
        } finally {
          setAiLoading(false);
        }
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [useAI]);

  const handleSearch = () => {
    setActiveCategory('');
    fetchResults(query);
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    setQuery('');
    setAiAnswer('');
    setAiSource('');
    fetchResults('', category);
  };

  const handleAskAI = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    setAiAnswer('');
    try {
      const res = await api.post('/knowledge/ask', { question: query, useAI: true });
      setAiAnswer(res.data.aiAnswer || '');
      setAiSource(res.data.aiSource || '');
      setResults(res.data.results || []);
    } catch {
      setAiAnswer('');
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: '#fff7e6', color: '#d46b08', padding: '0 2px', borderRadius: 2 }}>{part}</mark> : part
    );
  };

  return (
    <>
      <div
        ref={botRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'all 0.3s ease',
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={() => setVisible(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1890ff, #096dd9)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(24, 144, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            color: '#fff',
            outline: 'none',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 6px 24px rgba(24, 144, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 16px rgba(24, 144, 255, 0.4)';
          }}
        >
          🤖
        </button>
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: '-28px',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 10,
          fontSize: 12,
          whiteSpace: 'nowrap',
          opacity: 0,
          transition: 'opacity 0.3s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
        >
          AI知识库
        </div>
      </div>

      <Modal
        open={visible}
        onCancel={() => { setVisible(false); setSelectedItem(null); }}
        footer={null}
        width={420}
        style={{ top: 60 }}
        title={
          <Space>
            <span style={{ fontSize: 20 }}>🤖</span>
            <Text strong>AI 知识库</Text>
            <Tag color="blue">智能搜索</Tag>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            size="large"
            placeholder="输入关键词搜索，例如：投诉、理赔..."
            prefix={<SearchOutlined />}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap>
            {categories.map(cat => (
              <Tag
                key={cat}
                color={activeCategory === cat ? 'blue' : 'default'}
                onClick={() => handleCategoryClick(cat)}
                style={{ cursor: 'pointer', padding: '4px 10px' }}
              >
                {cat}
              </Tag>
            ))}
          </Space>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <RobotOutlined style={{ color: useAI ? '#1890ff' : '#bfbfbf', fontSize: 14 }} />
            <Tooltip title="开启后，当知识库无匹配结果时，自动调用AI搜索外部知识">
              <Switch
                checked={useAI}
                onChange={setUseAI}
                checkedChildren="AI搜索"
                unCheckedChildren="本地"
                size="small"
              />
            </Tooltip>
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Spin size="default" />
          </div>
        ) : results.length > 0 ? (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <List
              dataSource={results}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: `3px solid ${activeCategory ? '#1890ff' : '#52c41a'}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#f5f7fa'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  onClick={() => setSelectedItem(item)}
                >
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space direction="vertical" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Tag color="orange" style={{ fontSize: 11 }}>{item.category}</Tag>
                        <Text strong style={{ fontSize: 13 }}>{highlightText(item.title, query)}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {highlightText(item.content, query)}
                      </Text>
                    </Space>
                    <ArrowRightOutlined style={{ color: '#bfbfbf', fontSize: 14 }} />
                  </Space>
                </List.Item>
              )}
            />
            {useAI && (
              <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                <Button
                  type="text"
                  icon={<RobotOutlined />}
                  onClick={handleAskAI}
                  style={{ color: '#1890ff', fontSize: 12 }}
                >
                  没有找到满意的答案？让AI帮您解答
                </Button>
              </div>
            )}
          </div>
        ) : aiLoading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <Spin size="default" tip="AI正在思考..." />
          </div>
        ) : aiAnswer ? (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <Card
              size="small"
              title={
                <Space>
                  <RobotOutlined style={{ color: '#1890ff' }} />
                  <Text style={{ fontSize: 13 }}>AI智能回答</Text>
                  <Tag color="blue" style={{ fontSize: 10 }}>{aiSource === 'qwen' ? '通义千问' : aiSource === 'zhipu' ? '智谱AI' : aiSource === 'azure' ? 'Azure' : '本地'}</Tag>
                </Space>
              }
              style={{ marginBottom: 12 }}
            >
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 13, color: '#333' }}>
                {aiAnswer}
              </div>
            </Card>
            {query && (
              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  onClick={handleAskAI}
                  size="small"
                  loading={aiLoading}
                >
                  重新问AI
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 30, color: '#8c8c8c' }}>
            <MessageOutlined style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }} />
            <div style={{ fontSize: 14 }}>暂无相关知识条目</div>
            {useAI && query && (
              <div style={{ fontSize: 12, marginTop: 8 }}>
                <Button
                  type="text"
                  icon={<RobotOutlined />}
                  onClick={handleAskAI}
                  style={{ color: '#1890ff' }}
                >
                  让AI帮您搜索外部知识
                </Button>
              </div>
            )}
          </div>
        )}

        {selectedItem && (
          <Modal
            open={!!selectedItem}
            title={
              <Space>
                <Tag color="orange">{selectedItem.category}</Tag>
                <Text strong>{selectedItem.title}</Text>
              </Space>
            }
            onCancel={() => setSelectedItem(null)}
            footer={null}
            width={560}
          >
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14, color: '#333' }}>
              {selectedItem.content}
            </div>
            <Divider />
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              <Text strong>关键词：</Text>
              {selectedItem.keywords.map((k, i) => (
                <Tag key={k} size="small" color="default" style={{ marginLeft: i > 0 ? 4 : 0 }}>
                  {k}
                </Tag>
              ))}
            </div>
          </Modal>
        )}
      </Modal>
    </>
  );
}
