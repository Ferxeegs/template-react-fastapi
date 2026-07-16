import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

/** Registers React Router navigate with AuthContext (provider sits above Router). */
export default function AuthNavigationBridge() {
  const navigate = useNavigate();
  const { registerNavigate } = useAuth();

  useEffect(() => {
    registerNavigate((to) => navigate(to, { replace: true }));
  }, [navigate, registerNavigate]);

  return null;
}
