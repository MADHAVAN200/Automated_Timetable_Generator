
# Batch Beacon Timetable 📚

A comprehensive timetable management system built with React and Supabase, designed to streamline academic scheduling for educational institutions.

## 🌟 Features

- **Smart Timetable Generation**: Automated conflict-free scheduling algorithm
- **Faculty Management**: Complete faculty profiles with availability tracking
- **Subject Management**: Organize subjects with lab/theory classification
- **Resource Management**: Manage classrooms, labs, and other facilities
- **Class Management**: Handle multiple classes and batch divisions
- **Real-time Updates**: Live synchronization across all users
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Build Tool**: Vite
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js (v16 or higher)
- npm or yarn package manager
- A Supabase account and project

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd batch-beacon-timetable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Update the Supabase configuration in `src/integrations/supabase/client.ts`
   - Configure your database schema (see Database Setup section)

4. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8080`

## 🗄️ Database Setup

The application uses the following Supabase tables:

- **faculties**: Store faculty information and availability
- **subjects**: Manage subjects and their assigned faculty
- **classes**: Handle class information and batch divisions
- **resources**: Track available rooms and facilities
- **timetable_entries**: Store generated timetable data

## 🎯 Usage

### Getting Started

1. **Faculty Management**: Add faculty members with their subjects and availability
2. **Subject Setup**: Create subjects and assign qualified faculty
3. **Resource Management**: Add classrooms, labs, and other facilities
4. **Class Configuration**: Set up classes with their required subjects
5. **Generate Timetable**: Use the automated generation feature

### Key Workflows

- **Adding Faculty**: Navigate to Faculty Management → Add detailed profiles
- **Subject Creation**: Go to Subject Management → Define theory/lab subjects
- **Resource Setup**: Use Resource Management → Add rooms with capacity
- **Timetable Generation**: Access Timetable Generation → Configure and generate

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── ClassForm.tsx   # Class management forms
│   ├── FacultyForm.tsx # Faculty management forms
│   └── ...
├── pages/              # Main application pages
├── integrations/       # Supabase integration
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks
```

## 🔧 Configuration

### Supabase Setup

1. Create tables using the provided schema
2. Set up Row Level Security (RLS) policies
3. Configure authentication if needed
4. Update the client configuration

### Customization

- **Styling**: Modify `src/index.css` and Tailwind configuration
- **Components**: Extend or customize existing components in `src/components/`
- **Business Logic**: Update algorithms in `src/utils/`

## 📱 Features Overview

### Timetable Generation
- Conflict detection and resolution
- Faculty availability consideration
- Resource allocation optimization
- Batch-wise scheduling

### Management Modules
- **Faculty**: Profile management, subject assignment, availability tracking
- **Subjects**: Theory/lab classification, faculty assignment
- **Resources**: Room management, capacity tracking
- **Classes**: Batch organization, subject requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing issues for solutions

## 🚀 Deployment

The application can be deployed to various platforms:

- **Vercel**: Connect your repository for automatic deployments
- **Netlify**: Deploy with continuous integration
- **Custom Server**: Build and serve the static files

Build for production:
```bash
npm run build
```

## 🔄 Updates

Stay updated with the latest features and improvements by:
- Watching the repository
- Following the release notes
- Updating dependencies regularly

---

Built with ❤️ using React, Supabase, and modern web technologies.
