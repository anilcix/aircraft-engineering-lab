'use client'

import { useEffect, useMemo, useState } from 'react'

type Article = { title: string; url: string; source: string; publishedAt?: string }
type IntelPayload = { updatedAt: string; sourceSet: { name: string; domain: string }[]; cases: Record<string, { query: string; articles: Article[] }> }

type Props = {
  accident: {
    id: string; title: string; date: string; operator?: string; aircraft?: string; family?: string;
    location?: string; summary?: string; probableCause?: string; status?: string; sourceTier?: string
  }
}

const EMPTY: IntelPayload = { updatedAt: '', sourceSet: [], cases: {} }

const SOURCES = [
  { name: 'FlightGlobal', domain: 'flightglobal.com' },
  { name: 'Aviation Week', domain: 'aviationweek.com' },
  { name: 'The Aviation Herald', domain: 'avherald.com' },
  { name: 'AeroTime', domain: 'aerotime.aero' },
  { name: 'Simple Flying', domain: 'simpleflying.com' },
]

const FACTORS = [
  { key: 'weather', label: 'Hava / icing / türbülans', words: ['icing','ice ','turbulence','wind shear','windshear','storm','weather','convective','microburst','fog','visibility'] },
  { key: 'propulsion', label: 'Motor / yakıt / itki', words: ['engine','thrust','fuel','power loss','flameout','fan blade','compressor','propulsion'] },
  { key: 'structure', label: 'Yapısal / uçuş kumandası', words: ['structural','structure','elevator','rudder','aileron','flight control','control jam','pylon','separation','fatigue','fracture','crack'] },
  { key: 'approach', label: 'Yaklaşma / enerji / uçuş yolu', words: ['unstable approach','approach','landing','go-around','go around','airspeed','energy state','stall','overshoot','runway overrun'] },
  { key: 'systems', label: 'Elektrik / hidrolik / sistem', words: ['electrical','hydraulic','avionics','sensor','autopilot','system failure','warning','flight computer'] },
  { key: 'maintenance', label: 'Bakım / inspeksiyon', words: ['maintenance','inspection','overhaul','repair','missed inspection','service bulletin'] },
  { key: 'atc', label: 'ATC / havaalanı operasyonu', words: ['atc','controller','clearance','runway incursion','phraseology','airport lighting','wrong runway'] },
  { key: 'external', label: 'Harici etken / FOD / kuş', words: ['bird strike','bird','fod','foreign object','debris','drone'] },
]

function searchUrl(accident: Props['accident'], domain: string) {
  const terms = [accident.title, accident.operator, accident.aircraft, accident.date?.slice(0, 4)].filter(Boolean).join(' ')
  return 'https://www.google.com/search?q=' + encodeURIComponent('site:' + domain + ' ' + terms)
}

function supportLabel(score: number) {
  if (score >= 5) return { label: 'Yüksek destek', cls: 'high' }
  if (score >= 2) return { label: 'Orta destek', cls: 'medium' }
  return { label: 'Düşük destek', cls: 'low' }
}

export default function AccidentNewsIntelligence({ accident }: Props) {
  const [data, setData] = useState<IntelPayload>(EMPTY)

  useEffect(() => {
    fetch('./accident-news-intelligence.json', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((payload: IntelPayload) => setData(payload))
      .catch(() => undefined)
  }, [])

  const cached = data.cases[accident.id]
  const articles = cached?.articles || []

  const hypotheses = useMemo(() => {
    const base = [accident.title, accident.summary, accident.probableCause, accident.location, ...articles.map((x) => x.title)].filter(Boolean).join(' ').toLowerCase()
    return FACTORS.map((factor) => {
      let score = 0
      const evidence: string[] = []
      for (const word of factor.words) if (base.includes(word)) score += 1
      for (const article of articles) {
        const text = article.title.toLowerCase()
        const hits = factor.words.filter((word) => text.includes(word))
        if (hits.length) {
          score += Math.min(2, hits.length)
          evidence.push(article.source + ': ' + article.title)
        }
      }
      return { ...factor, score, evidence: evidence.slice(0, 3), support: supportLabel(score) }
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
  }, [accident, articles])

  return (
    <section className="accident-intel">
      <div className="dashboard-section-title">
        <span>5 kaynaklı olay istihbaratı</span>
        <small>{data.updatedAt ? 'Son tarama: ' + new Date(data.updatedAt).toLocaleString('tr-TR') : 'Kaynak indeksi yükleniyor'}</small>
      </div>

      <div className="accident-intel-warning">
        <strong>ERKEN AŞAMA ANALİZİ</strong>
        <p>Bu bölüm resmî probable cause değildir. Haberlerde bildirilen olguları ve olay kartındaki mevcut veriyi bir araya getirir; soruşturma ilerledikçe hipotezler değişebilir.</p>
      </div>

      <div className="accident-source-grid">
        {SOURCES.map((source) => {
          const sourceArticles = articles.filter((x) => x.source === source.name)
          return <div className="accident-source-card" key={source.domain}>
            <div><strong>{source.name}</strong><span>{sourceArticles.length ? sourceArticles.length + ' eşleşme' : 'Kayıtlı eşleşme yok'}</span></div>
            {sourceArticles.slice(0, 2).map((article) => <a key={article.url} href={article.url} target="_blank" rel="noreferrer">{article.title} ↗</a>)}
            <a className="source-search-link" href={searchUrl(accident, source.domain)} target="_blank" rel="noreferrer">Bu olayı kaynakta ara ↗</a>
          </div>
        })}
      </div>

      {articles.length > 0 && <div className="accident-intel-articles">
        <h4>Kaynaklarda bulunan haberler</h4>
        {articles.slice(0, 10).map((article) => <a href={article.url} target="_blank" rel="noreferrer" key={article.url}>
          <span>{article.source}</span><strong>{article.title}</strong><small>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('tr-TR') : ''}</small>
        </a>)}
      </div>}

      <div className="accident-hypotheses">
        <div className="dashboard-section-title"><span>Rapor öncesi olası katkı faktörleri</span><small>Yüzde değil · kanıt desteği</small></div>
        {hypotheses.length ? hypotheses.map((factor) => <div className="hypothesis-card" key={factor.key}>
          <div className="hypothesis-head"><strong>{factor.label}</strong><span className={'support-' + factor.support.cls}>{factor.support.label}</span></div>
          {factor.evidence.length > 0 ? factor.evidence.map((item) => <p key={item}>• {item}</p>) : <p>Olay başlığı/özeti içinde bu faktörle ilişkili ifade bulundu; bağımsız haber teyidi henüz sınırlı.</p>}
        </div>) : <div className="accident-intel-empty">Mevcut açık kaynak verisi anlamlı bir hipotezi desteklemek için yetersiz. Bu durumda sistem sebep tahmini üretmez.</div>}
      </div>
    </section>
  )
}
