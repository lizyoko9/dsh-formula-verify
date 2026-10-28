window.__ModuleLoader__.load({
  id: 'dsh-formula-verify',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PACKAGE_ID = 'dsh-formula-verify';
    const TYPE_ID = PACKAGE_ID + '/lab';
    const KIND = 'formula-lab';
    const NS = 'formulaLab';
    const FILE_PREFIX = 'dsh-resource://file/';

    const STATUS_META = {
      'verified-symbolic': { icon: '✅', label: 'symbolic' },
      'numeric-evidence': { icon: '🟡', label: 'numeric only' },
      'probe-failed': { icon: '❌', label: 'failed' },
      definition: { icon: '⏳', label: 'definition' },
      'needs-modeling': { icon: '⏳', label: 'needs model' },
      unparsed: { icon: '⏳', label: 'unparsed' },
      'needs-latex': { icon: '⏳', label: 'needs LaTeX' },
      extracted: { icon: '⏳', label: 'extracted' }
    };

    const CSS = [
      '.fl_root{box-sizing:border-box;flex-direction:column;width:100%;height:100%;min-width:0;min-height:0;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;display:flex}',
      '.fl_head{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:6px;height:38px;padding:0 6px 0 12px;display:flex}',
      '.fl_heading{flex:1 1 auto;min-width:0;align-items:center;gap:7px;display:flex}',
      '.fl_title{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.fl_tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;background:0 0;border:none;flex:none;justify-content:center;align-items:center;padding:6px;display:inline-flex}',
      '.fl_tool:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}',
      '.fl_tool svg{width:15px;height:15px}',
      '.fl_body{flex:auto;min-height:0;overflow:auto;scrollbar-gutter:stable;padding:10px 10px 18px}',
      '.fl_form{background:var(--dsw-alias-fill-l1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;flex-direction:column;gap:9px;padding:11px;display:flex}',
      '.fl_field{flex-direction:column;gap:4px;min-width:0;display:flex}',
      '.fl_label{color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}',
      '.fl_input{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);width:100%;min-width:0;height:30px;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;outline:none;padding:0 8px}',
      '.fl_input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}',
      '.fl_hint{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}',
      '.fl_row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.fl_check{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.fl_run{box-sizing:border-box;border:none;border-radius:7px;background:var(--dsw-alias-state-business-primary);width:100%;height:32px;color:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:600;justify-content:center;align-items:center;display:inline-flex}',
      '.fl_run:hover{filter:brightness(1.08)}',
      '.fl_run:disabled{opacity:.5;cursor:default;filter:none}',
      '.fl_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:17px;white-space:pre-wrap;word-break:break-word;margin:0}',
      '.fl_notice{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin:0}',
      '.fl_summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:10px 0 4px}',
      '.fl_stat{background:var(--dsw-alias-fill-l1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:7px 9px;min-width:0}',
      '.fl_statValue{font-size:17px;line-height:20px;font-weight:600;font-variant-numeric:tabular-nums}',
      '.fl_statLabel{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.fl_section{margin-top:12px}',
      '.fl_sectionTitle{color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:0 0 4px 4px}',
      '.fl_cardRow{border-radius:7px;width:100%;min-width:0;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:center;gap:8px;padding:6px 7px;font:inherit;display:flex}',
      '.fl_cardRow:hover,.fl_cardRow:focus-visible{background:var(--dsw-alias-fill-l1)}',
      '.fl_dot{border-radius:50%;flex:none;width:7px;height:7px;background:var(--dsw-alias-label-quaternary);margin-top:1px}',
      '.fl_dot[data-status=verified-symbolic]{background:var(--dsw-alias-state-success-primary)}',
      '.fl_dot[data-status=numeric-evidence]{background:var(--dsw-alias-state-warn-primary)}',
      '.fl_dot[data-status=probe-failed]{background:var(--dsw-alias-state-error-primary)}',
      '.fl_main{flex:1 1 auto;min-width:0;flex-direction:column;gap:1px;display:flex}',
      '.fl_cardTitle{font-size:12px;line-height:17px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.fl_meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.fl_badge{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:16px;white-space:nowrap}',
      '.fl_actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
      '.fl_link{border:none;border-radius:6px;background:0 0;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:11px;padding:4px 7px}',
      '.fl_link:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-fill-l1)}',
      '.fl_empty{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;padding:12px 4px}',
      '.fl_chip{align-items:center;gap:6px;min-width:0;display:inline-flex}',
      '.fl_chipIcon{flex:none;display:inline-flex}',
      '.fl_chipText{text-overflow:ellipsis;overflow:hidden;white-space:nowrap}'
    ].join('\n');

    const CSS_TAG_ID = PACKAGE_ID + '/formula-lab.css';
    if (typeof document !== 'undefined') {
      const existing = document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_TAG_ID) + ']');
      if (existing !== null) {
        existing.textContent = CSS;
      } else {
        const tag = document.createElement('style');
        tag.dataset.plugin = PACKAGE_ID;
        tag.dataset.pluginCss = CSS_TAG_ID;
        tag.textContent = CSS;
        document.head.appendChild(tag);
      }
    }

    const zh = {
      title: '公式面板',
      'guide.title': '公式面板',
      'guide.description': '从 TeX/PDF 生成公式卡与验算报告',
      source: '源文件',
      output: '输出目录',
      probe: '自动探测简单等式',
      backend: 'PDF 转换',
      backendNone: '不转换（直接抽取，可能丢 LaTeX）',
      backendMathpix: 'Mathpix（需 MATHPIX_APP_ID/KEY）',
      backendCommand: '外部命令（MinerU / Nougat）',
      command: '转换命令',
      run: '转换并提取',
      running: '正在提取…',
      refresh: '刷新文件',
      noFiles: '工作区里没有 .tex / .pdf / .md',
      needBackend: '未注入 Formula Lab 后端：请安装 bundle 后刷新页面。',
      requestFailed: '请求失败',
      summary: '验算汇总',
      openReport: '打开 report.md',
      openIndex: '打开 index.md',
      empty: '还没有结果，选一个文件开始。',
      hintPdf: 'PDF 直接抽取会丢失公式结构；建议用 Mathpix 或 MinerU 先转换。',
      hintCommand: '命令里用 {input} 和 {outdir} 占位。',
      'status.verified-symbolic': 'symbolic',
      'status.numeric-evidence': 'numeric',
      'status.probe-failed': 'failed',
      'status.definition': 'definition',
      'status.needs-modeling': 'needs model',
      'status.unparsed': 'unparsed',
      'status.needs-latex': 'needs LaTeX',
      'status.extracted': 'extracted'
    };
    const en = {
      title: 'Formula Lab',
      'guide.title': 'Formula Lab',
      'guide.description': 'Extract formula cards and a verification report from TeX/PDF',
      source: 'Source',
      output: 'Output',
      probe: 'Auto-probe simple equalities',
      backend: 'PDF conversion',
      backendNone: 'None (direct PDF extraction, lossy)',
      backendMathpix: 'Mathpix (MATHPIX_APP_ID/KEY)',
      backendCommand: 'External command (MinerU / Nougat)',
      command: 'Converter command',
      run: 'Convert & extract',
      running: 'Extracting…',
      refresh: 'Refresh files',
      noFiles: 'No .tex / .pdf / .md files in this workspace',
      needBackend: 'Formula Lab backend is not injected. Install the bundle and reload.',
      requestFailed: 'Request failed',
      summary: 'Verification summary',
      openReport: 'Open report.md',
      openIndex: 'Open index.md',
      empty: 'No result yet. Pick a file to start.',
      hintPdf: 'Direct PDF extraction loses formula structure; use Mathpix or MinerU first.',
      hintCommand: 'Use {input} and {outdir} placeholders in the command.',
      'status.verified-symbolic': 'symbolic',
      'status.numeric-evidence': 'numeric',
      'status.probe-failed': 'failed',
      'status.definition': 'definition',
      'status.needs-modeling': 'needs model',
      'status.unparsed': 'unparsed',
      'status.needs-latex': 'needs LaTeX',
      'status.extracted': 'extracted'
    };

    function SigmaGlyph(props) {
      const size = props !== undefined && typeof props.size === 'number' ? props.size : 16;
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': 'true',
        style: { color: 'var(--dsw-alias-state-business-primary)', flex: 'none' }
      },
        h('path', { d: 'M3.5 2.5h9M3.5 13.5h9M3.8 2.5l4.1 5.5-4.1 5.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
      );
    }

    function ReloadGlyph() {
      return h('svg', { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M13 8a5 5 0 1 1-1.7-3.75', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
        h('path', { d: 'M13.2 2.7v2.6h-2.6', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
      );
    }

    function fileAddress(sessionId, path) {
      const normalized = String(path).replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
      return FILE_PREFIX + 'session/' + encodeURIComponent(sessionId) + '/' + normalized.split('/').map(encodeURIComponent).join('/');
    }

    function statusMeta(status) {
      return STATUS_META[status] || { icon: '⏳', label: status };
    }

    function createLabBody(ctx) {
      return function LabBody(props) {
        const t = props.t;
        const sessionId = props.sessionId;
        const cwd = props.useSessions((sessions) => sessions.byId[sessionId]?.cwd);
        const config = React.useMemo(() => (typeof globalThis !== 'undefined' ? globalThis.__FORMULA_LAB__ : undefined), []);
        const [files, setFiles] = React.useState([]);
        const [source, setSource] = React.useState('');
        const [out, setOut] = React.useState('formulas');
        const [probe, setProbe] = React.useState(true);
        const [backend, setBackend] = React.useState('none');
        const [command, setCommand] = React.useState('');
        const [busy, setBusy] = React.useState(false);
        const [error, setError] = React.useState('');
        const [result, setResult] = React.useState(undefined);

        const base = config === undefined ? '' : (config.origin ? String(config.origin).replace(/\/$/, '') : '') + config.endpoint;

        const request = React.useCallback(async (route, options) => {
          if (config === undefined || config === null) throw new Error(t('needBackend'));
          const response = await fetch(base + route, {
            ...options,
            headers: {
              'content-type': 'application/json',
              'x-formula-lab-token': config.token,
              ...(options !== undefined && options.headers !== undefined ? options.headers : {})
            }
          });
          const data = await response.json().catch(() => ({ ok: false, error: 'invalid JSON response' }));
          if (!response.ok || data.ok !== true) {
            throw new Error(data.error || t('requestFailed'));
          }
          return data;
        }, [base, config, t]);

        const loadFiles = React.useCallback(async () => {
          if (config === undefined || config === null || cwd === undefined || cwd === '') return;
          try {
            const data = await request('/files?cwd=' + encodeURIComponent(cwd));
            const next = Array.isArray(data.files) ? data.files : [];
            setFiles(next);
            setSource((current) => (next.some((item) => item.path === current) ? current : (next[0]?.path || '')));
          } catch (reason) {
            setError(String(reason.message || reason));
          }
        }, [config, cwd, request]);

        React.useEffect(() => {
          loadFiles();
        }, [loadFiles]);

        const run = async () => {
          if (source === '' || busy) return;
          setBusy(true);
          setError('');
          setResult(undefined);
          try {
            const body = {
              action: 'pipeline',
              cwd,
              input: source,
              out,
              noProbe: !probe,
              max: 80,
              ...(source.toLowerCase().endsWith('.pdf') && backend !== 'none' ? { backend } : {}),
              ...(backend === 'command' ? { command } : {})
            };
            const data = await request('/run', { method: 'POST', body: JSON.stringify(body) });
            setResult(data);
          } catch (reason) {
            setError(String(reason.message || reason));
          } finally {
            setBusy(false);
          }
        };

        const openFile = (relative) => {
          const right = typeof ctx.get === 'function' ? ctx.get('sidebarRight') : undefined;
          if (right === undefined || typeof right.openResourceIn !== 'function') return;
          const path = [out.replace(/\/+$/, ''), relative].filter(Boolean).join('/').replace(/\/+/g, '/');
          try {
            right.openResourceIn(sessionId, fileAddress(sessionId, path), { preferNewPane: true });
          } catch (failure) {
            console.error('formula-lab: could not open ' + path, failure);
          }
        };

        const report = result !== undefined && result.report !== undefined ? result.report.json : undefined;
        const statuses = report !== undefined && report.statuses !== undefined ? report.statuses : {};
        const sections = report !== undefined && Array.isArray(report.sections) ? report.sections : [];
        const total = Object.values(statuses).reduce((sum, value) => sum + Number(value || 0), 0);

        const renderStatusCount = (status) => h('div', { className: 'fl_stat', key: status },
          h('div', { className: 'fl_statValue' }, String(statuses[status] || 0)),
          h('div', { className: 'fl_statLabel' }, statusMeta(status).icon + ' ' + t('status.' + status))
        );

        return h('div', { className: 'fl_root', 'data-better-dsh': KIND },
          h('div', { className: 'fl_head' },
            h('div', { className: 'fl_heading' },
              h(SigmaGlyph, { size: 16 }),
              h('span', { className: 'fl_title' }, t('title'))
            ),
            h('button', { type: 'button', className: 'fl_tool', title: t('refresh'), 'aria-label': t('refresh'), onClick: loadFiles }, h(ReloadGlyph))
          ),
          h('div', { className: 'fl_body' },
            config === undefined ? h('p', { className: 'fl_error' }, t('needBackend')) : null,
            h('div', { className: 'fl_form' },
              h('div', { className: 'fl_field' },
                h('span', { className: 'fl_label' }, t('source')),
                files.length === 0
                  ? h('input', { className: 'fl_input', value: source, placeholder: 'paper.tex', onChange: (event) => setSource(event.target.value) })
                  : h('select', { className: 'fl_input', value: source, onChange: (event) => setSource(event.target.value) },
                      files.map((item) => h('option', { key: item.path, value: item.path }, item.path)))
              ),
              h('div', { className: 'fl_field' },
                h('span', { className: 'fl_label' }, t('output')),
                h('input', { className: 'fl_input', value: out, onChange: (event) => setOut(event.target.value) })
              ),
              h('label', { className: 'fl_check' },
                h('input', { type: 'checkbox', checked: probe, onChange: (event) => setProbe(event.target.checked) }),
                t('probe')
              ),
              source.toLowerCase().endsWith('.pdf') ? h('div', { className: 'fl_field' },
                h('span', { className: 'fl_label' }, t('backend')),
                h('select', { className: 'fl_input', value: backend, onChange: (event) => setBackend(event.target.value) },
                  h('option', { value: 'none' }, t('backendNone')),
                  h('option', { value: 'mathpix' }, t('backendMathpix')),
                  h('option', { value: 'command' }, t('backendCommand'))
                ),
                backend === 'command' ? h('input', { className: 'fl_input', value: command, placeholder: 'mineru -p {input} -o {outdir}', onChange: (event) => setCommand(event.target.value) }) : null,
                backend === 'command' ? h('span', { className: 'fl_hint' }, t('hintCommand')) : null,
                backend === 'none' ? h('span', { className: 'fl_hint' }, t('hintPdf')) : null
              ) : null,
              h('button', { type: 'button', className: 'fl_run', disabled: busy || source === '' || config === undefined, onClick: run },
                busy ? t('running') : t('run'))
            ),
            error !== '' ? h('p', { className: 'fl_error' }, error) : null,
            result === undefined
              ? h('div', { className: 'fl_empty' }, t('empty'))
              : h('div', null,
                  h('div', { className: 'fl_summary' },
                    ['verified-symbolic', 'numeric-evidence', 'probe-failed'].map(renderStatusCount),
                    h('div', { className: 'fl_stat', key: 'total' },
                      h('div', { className: 'fl_statValue' }, String(total)),
                      h('div', { className: 'fl_statLabel' }, t('summary'))
                    )
                  ),
                  sections.map((section) => h('section', { className: 'fl_section', key: section.section },
                    h('h3', { className: 'fl_sectionTitle' }, section.section),
                    section.cards.map((card) => h('button', {
                      type: 'button',
                      className: 'fl_cardRow',
                      key: card.id,
                      title: card.title,
                      onClick: () => openFile(card.card)
                    },
                      h('span', { className: 'fl_dot', 'data-status': card.status }),
                      h('span', { className: 'fl_main' },
                        h('span', { className: 'fl_cardTitle' }, card.title),
                        h('span', { className: 'fl_meta' }, card.source)
                      ),
                      h('span', { className: 'fl_badge' }, statusMeta(card.status).icon + ' ' + t('status.' + card.status))
                    ))
                  )),
                  h('div', { className: 'fl_actions' },
                    h('button', { type: 'button', className: 'fl_link', onClick: () => openFile('report.md') }, t('openReport')),
                    h('button', { type: 'button', className: 'fl_link', onClick: () => openFile('index.md') }, t('openIndex'))
                  )
                )
          )
        );
      };
    }

    function LabTitle(props) {
      const t = props.t;
      return h('span', { className: 'fl_chip' },
        h('span', { className: 'fl_chipIcon' }, h(SigmaGlyph, { size: 16 })),
        h('span', { className: 'fl_chipText' }, t('title'))
      );
    }

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'formula-lab: copy');
        const t = ctx.locale.bind(NS);
        const tabs = ctx.get('sidebarRightTabs');
        if (tabs === undefined) return;
        const body = createLabBody(ctx);
        ctx.effect(() => tabs.register({
          id: TYPE_ID,
          kind: KIND,
          keepMounted: true,
          title: () => t('title'),
          guide: [{
            id: 'lab',
            order: 3,
            title: () => t('guide.title'),
            description: () => t('guide.description'),
            icon: SigmaGlyph
          }]
        }), 'formula-lab: type');
        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: TYPE_ID,
          locale: NS
        }, body)), 'formula-lab: body');
        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: TYPE_ID,
          locale: NS
        }, LabTitle)), 'formula-lab: title');
      }
    };
  }
});
