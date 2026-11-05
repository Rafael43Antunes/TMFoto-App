# TM Foto 📸

![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**TM Foto** é uma aplicação desktop desenvolvida do zero para resolver um problema real de negócio: automatizar o fluxo de trabalho exaustivo de uma equipa de fotografia desportiva (especializada em torneios de patinagem artística), desde a preparação pré-evento até à entrega final ao cliente.

---

## 🎯 O Problema e a Solução

Gerir pedidos de fotografias em torneios de grande escala envolvia dezenas de tarefas manuais e repetitivas: criar estruturas de pastas em disco, fazer uploads individuais para a cloud, e enviar manualmente os links de acesso via WhatsApp e Email a cada atleta.

A **TM Foto** centraliza e automatiza todo este ecossistema num único software desktop de alta performance:
* **Antes do torneio:** Extrai dados de ficheiros PDF oficiais para gerar automaticamente pastas estruturadas no computador.
* **Depois do torneio:** Um motor de background em background orquestra envios para o Google Drive e disparos automáticos de mensagens via WhatsApp e Email.

---

## ✨ Funcionalidades Principais

* **🏠 Dashboard & Início:** Ecrã central intuitivo com saudações dinâmicas baseadas na hora do dia e um slideshow integrado de fotografias do torneio.
* **📂 Gerador de Pastas Automático:** Processamento de ficheiros PDF para extração de dados e criação imediata de pastas organizadas por escalão e atleta.
* **🗄️ Base de Dados & Gestão de Atletas:** Controlo completo de milhares de registos de atletas, clubes e associações, com pesquisa instantânea e sistema de reciclagem (soft delete).
* **🚀 Centro de Envios:** Pipeline automatizado que lida com o upload para a Cloud e a comunicação multicanal com os clientes.
* **📊 Estatísticas e Relatórios:** Análise financeira integrada com gráficos para identificar os torneios mais rentáveis, faturação acumulada e preferências de pedidos da comunidade.

---

## 🛠️ Stack Tecnológica

* **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
* **Backend & Desktop Core:** Node.js, Electron, Electron-Vite.
* **Base de Dados:** SQLite (com otimizações avançadas de concorrência).
* **APIs & Integrações:** 
  * **Google Drive API** (gestão e partilha de diretórios na cloud).
  * **Google Gemini API** (suporte para IA e automações).
  * **whatsapp-web.js** (automação de mensagens de entrega).
  * **Nodemailer** (envio de emails automatizados).
  * **XLSX** (importação de dados via folha de cálculo).

---

## 🧠 Arquitetura e Desafios Técnicos

Este projeto foi construído com uma forte preocupação em engenharia de sistemas:
* **Concorrência no SQLite (Modo WAL):** Implementação de *Write-Ahead Logging* e *busy timeouts* para permitir que o processo de automação em segundo plano escreva na base de dados em simultâneo com a leitura da interface, evitando bloqueios (*locks*).
* **IPC Seguro (Inter-Process Communication):** Separação estrita entre o *Main Process* (Node.js/APIs) e o *Renderer Process* (React) através de canais seguros de ponte.
* **Otimização de Renderização:** Paginação e limitação de nós no DOM para garantir fluidez ao navegar por bases de dados extensas com milhares de atletas.

---
