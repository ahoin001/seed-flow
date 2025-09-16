import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, AlertTriangle } from "lucide-react";
import { NavigationHeader } from "@/components/NavigationHeader";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <NavigationHeader title="Page Not Found" />
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto shadow-elegant text-center">
          <CardContent className="p-8">
            <AlertTriangle className="h-16 w-16 mx-auto text-warning mb-4" />
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-xl text-muted-foreground mb-6">
              Oops! The page you're looking for doesn't exist.
            </p>
            <Link to="/">
              <Button variant="premium" size="lg" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
