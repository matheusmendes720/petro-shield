# bg-boilerplate

> Boilerplate React + Vite com o background animado **CircuitBackground** isolado do projeto PetroShield.

---

## 🚀 Começando

```bash
cd bg-boilerplate
npm install
npm run dev
```

Acesse `http://localhost:5173`

---

## 📁 Estrutura

```
bg-boilerplate/
├── src/
│   ├── components/
│   │   └── CircuitBackground.tsx   ← Background animado (canvas)
│   ├── pages/
│   │   └── Home.tsx                ← Página inicial vazia (starter)
│   ├── App.tsx                     ← Router + Layout com background
│   ├── index.css                   ← Tokens de design e reset
│   └── main.tsx                    ← Entry point
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.*.json
```

---

## 🛣️ Routing

O `react-router-dom` já está configurado em `App.tsx`. Para adicionar novas páginas:

1. Crie o componente em `src/pages/NovaPagina.tsx`
2. Importe e registre a rota em `App.tsx`:

```tsx
import NovaPagina from './pages/NovaPagina'

<Route path="/nova-pagina" element={<NovaPagina />} />
```

Todas as rotas filhas de `/` herdam automaticamente o `<CircuitBackground />` fixo.

---

## 🎨 Design Tokens

As variáveis CSS em `index.css` seguem a identidade visual PetroShield:

| Token | Valor | Uso |
|-------|-------|-----|
| `--neon-green` | `#00FF41` | Destaques, energia, status OK |
| `--fire-orange` | `#FF6200` | Alertas, logo, calor |
| `--terminal-cyan` | `#00FFFF` | Dados, clocks, métricas |
| `--void-black` | `#0A0A0A` | Fundo geral |

---

## ⚡ Background

`CircuitBackground` é um componente canvas puro que renderiza:
- Chuva Matrix sutil (parallax via mouse)
- Nodos de circuito com conexões em L (estilo PCB)
- Partículas flutuantes (verde neon / laranja)
- Efeito scanline ocasional

O canvas ocupa `position: fixed` com `z-index: 0` e `pointer-events: none`, deixando a área de conteúdo totalmente interativa.
