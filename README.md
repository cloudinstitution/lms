# 🎓 Cloud Institution LMS Portal

A comprehensive Learning Management System (LMS) built with Next.js, featuring course management, student tracking, assessments, programming environments, and more.

## 🌟 Recent Updates - Homepage Redesign (Issue #28)

✨ **Complete homepage overhaul** with modern design, infinite carousels, and modular architecture
📄 **New pages added**: About and Contact pages
🏗️ **Modular components**: Split into reusable React components
📱 **Responsive design**: Optimized for all devices with dark mode support

👉 **[View Complete Homepage Improvements Documentation](./HOMEPAGE_IMPROVEMENTS.md)**

## 🚀 Features

### 📚 Course Management
- **Course Creation & Management**: Full CRUD operations for courses
- **Content Management**: Rich text editor for course materials
- **Video Integration**: Embedded video lessons
- **Progress Tracking**: Student progress monitoring

### 👥 User Management
- **Multi-Role System**: Admin, Teacher, Student roles
- **Authentication**: Secure login with Firebase Auth
- **Profile Management**: User profiles and settings

### 📊 Assessment System
- **Quiz Creation**: Dynamic quiz builder
- **Programming Challenges**: Code execution environment
- **Auto-Grading**: Automated assessment scoring
- **Results Analytics**: Detailed performance reports

### 💻 Programming Environment
- **Code Editor**: Monaco-based code editor
- **Multi-Language Support**: Python, JavaScript, Java, C++, and more
- **Judge0 Integration**: Secure code execution
- **Real-time Feedback**: Instant code compilation and testing

### 📈 Attendance & Analytics
- **QR Code Attendance**: Mobile-friendly attendance system
- **Analytics Dashboard**: Comprehensive reporting
- **Export Features**: Excel/CSV export capabilities
- **Real-time Tracking**: Live attendance monitoring

### 🎨 Modern UI/UX
- **Dark Mode Support**: System-wide dark/light theme
- **Responsive Design**: Mobile-first approach
- **Infinite Carousels**: Smooth animations and transitions
- **Interactive Components**: Engaging user interface

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **UI Components**: Radix UI, Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Code Execution**: Judge0 API
- **File Processing**: ExcelJS, XLSX
- **Deployment**: Vercel

## 🏗️ Project Structure

```
lmsportal/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Route groups
│   ├── admin/             # Admin dashboard
│   ├── student/           # Student portal
│   ├── api/               # API endpoints
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── home/             # Homepage modular components
│   ├── ui/               # Base UI components
│   └── forms/            # Form components
├── lib/                  # Utility functions
├── hooks/                # Custom React hooks
├── types/                # TypeScript definitions
└── public/               # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Firebase project setup
- Judge0 API access (for code execution)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd lmsportal
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment Setup**
Create `.env.local` file with:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config

# Judge0 Configuration
JUDGE0_API_URL=your_judge0_url
JUDGE0_API_KEY=your_judge0_key
```

4. **Run development server**
```bash
npm run dev
# or
yarn dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 User Roles & Access

### 🔐 Admin Dashboard
- Course management and creation
- Student and teacher management
- System analytics and reports
- Attendance tracking
- Assessment management

### 👨‍🏫 Teacher Portal
- Course content creation
- Student progress monitoring
- Assignment grading
- Attendance management

### 👨‍🎓 Student Portal
- Course enrollment and access
- Assignment submission
- Progress tracking
- QR code attendance
- Programming challenges

## 🎨 Homepage Features

### Hero Section
- 6-slide infinite carousel
- Real course images with glow effects
- Responsive CTAs with contact info

### Course Showcase
- Featured courses grid
- Interactive hover effects
- Star ratings and student counts

### Testimonials
- Infinite horizontal scroll
- Student success stories
- Professional company affiliations

### Hiring Partners
- 300+ partner companies
- Dual-row infinite scroll
- Major tech company logos

## 📊 Analytics & Reporting

- **Student Performance**: Individual and class-wide analytics
- **Course Analytics**: Completion rates, engagement metrics
- **Attendance Reports**: Daily, weekly, monthly summaries
- **Export Capabilities**: Excel, CSV, PDF formats

## 🔧 Development

### Code Quality
- **TypeScript**: Type-safe development
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality assurance

### Testing
```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
npm run test:coverage # Coverage report
```

### Build & Deployment
```bash
npm run build       # Production build
npm run start       # Production server
npm run lint        # Lint checking
```

## 📝 Documentation

- 📋 **[Homepage Improvements](./HOMEPAGE_IMPROVEMENTS.md)** - Complete redesign documentation
- 📋 **[GitHub Issue #28 Summary](./GITHUB_COMMENT_ISSUE_28.md)** - Ready-to-post issue comment
- 📋 **[Attendance System](./docs/NEW_ATTENDANCE_SYSTEM.md)** - QR code attendance documentation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the Cloud Institution internship program.

## 📞 Support

For support and queries:
- 📧 Email: support@cloudinstitution.com
- 📱 Phone: +91 9346 936 936 / +91 9346 936 937
- 🌐 Website: [cloudinstitution.com](https://cloudinstitution.com)

---

**Built with ❤️ by the Cloud Institution Team**
