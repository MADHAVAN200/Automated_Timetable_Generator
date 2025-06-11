
import { cn } from "@/lib/utils";
import { 
  ChevronLeft, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  SquareStack, 
  CalendarDays,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on mobile and collapse by default
  useEffect(() => {
    const checkIfMobile = () => {
      setCollapsed(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/"
    },
    {
      icon: Users,
      label: "Faculty",
      path: "/faculty"
    },
    {
      icon: BookOpen,
      label: "Subjects",
      path: "/subjects"
    },
    {
      icon: SquareStack,
      label: "Resources",
      path: "/resources"
    },
    {
      icon: CalendarDays,
      label: "Timetable",
      path: "/timetable"
    }
  ];
  
  return (
    <div className={cn(
      "flex flex-col h-screen bg-sidebar border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h2 className="text-xl font-bold">TimeTable</h2>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className={cn("ml-auto", collapsed && "mx-auto")}
        >
          {collapsed ? <Menu /> : <ChevronLeft />}
        </Button>
      </div>
      
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant={location.pathname === item.path ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start mb-1",
                collapsed ? "px-2" : "px-4"
              )}
              onClick={() => navigate(item.path)}
            >
              <item.icon className={cn("h-5 w-5", !collapsed && "mr-2")} />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};
