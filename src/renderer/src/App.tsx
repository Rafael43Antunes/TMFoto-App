import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'

// Importar as páginas da nova pasta
import Home from './pages/Home'
import BaseDados from './pages/BaseDados'
import Pastas from './pages/Pastas'
import Torneios from './pages/Torneios'
import Envios from './pages/Envios'
import Estatisticas from './pages/Estatisticas'
import Definicoes from './pages/Definicoes'


export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/basedados" element={<BaseDados />} />
          <Route path="/pastas" element={<Pastas />} /> 
          <Route path="/torneios" element={<Torneios />} /> 
          <Route path="/envios" element={<Envios />} />
          <Route path="/estatisticas" element={<Estatisticas />} /> 
          <Route path="/definicoes" element={<Definicoes/>} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}