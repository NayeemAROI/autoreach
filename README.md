# AutoReach: Advanced LinkedIn Automation & Workflow Builder

AutoReach is a professional-grade LinkedIn automation tool designed to streamline lead generation and outreach workflows. It features a cutting-edge **Campaign Builder** with a flowchart-style interface, allowing users to design complex, multi-step sequences with ease.

![Final Flowchart with Straight Edges](https://github.com/NayeemAROI/autoreach/raw/master/client/public/flowchart_demo.png)

## 🚀 Key Features

### 🛠️ Strategic Campaign Builder
- **React Flow Native Architecture**: A robust, draggable, and zoomable flowchart interface.
- **Hierarchical Auto-Layout**: Symmetric middle alignment using the Dagre layout engine.
- **Orthogonal Edge Design**: Clean, straight-line connections for a professional flowchart look.
- **Glassmorphism UI**: Premium, modern aesthetics with vibrant gradients and subtle shadows.
- **Smart Branching**: Easily create conditional paths (YES/NO) based on lead interactions (e.g., "Invite Accepted", "Replied").

### 📊 Lead Management
- **Functional Lead Actions**: Verify, Re-verify, and Delete leads directly from the builder.
- **Polling & Verification**: Real-time status updates for lead verification processes.

### 🧩 Chrome Extension
- **SalesNav Integration**: Effortlessly export leads from LinkedIn Sales Navigator directly into your campaigns.

## 🏗️ Technical Architecture

- **Frontend**: React, @xyflow/react (React Flow), Lucide React, Tailwind CSS.
- **Backend**: Express.js, Node.js.
- **Database**: SQLite (via better-sqlite3).
- **Communication**: Chrome Messaging API (Extension to App).

## 📥 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/NayeemAROI/autoreach.git
cd autoreach
```

### 2. Backend Setup
```bash
cd server
npm install
node migrate_db.js
npm start
```
The server will start on `http://localhost:3001`.

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
The application will be available at `http://localhost:5173`.

### 4. Chrome Extension
- Open Chrome and navigate to `chrome://extensions/`.
- Enable "Developer mode".
- Click "Load unpacked" and select the `extension` directory.

## 🛡️ Security & Best Practices
- **Token-based Authentication**: Secure access to the campaign dashboard.
- **Graceful Error Handling**: Custom in-flow modals and error boundaries for a seamless experience.

---

Built with ❤️ by [NayeemAROI](https://github.com/NayeemAROI)
