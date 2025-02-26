import React, { useState } from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from "@mui/material";
import { Link } from "react-router-dom";

import MuiDrawer from "@mui/material/Drawer";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HomeIcon from "@mui/icons-material/Home";

// Example icons for nav items
import DashboardIcon from "@mui/icons-material/Dashboard";

// Your WAF components
import WAFRuleTree from "./components/ruleCheck";

////////////////////////////////////////////////////////////////////////////////
// CONFIG
////////////////////////////////////////////////////////////////////////////////
const drawerWidth = 240;

////////////////////////////////////////////////////////////////////////////////
// MUI TRANSITIONS
////////////////////////////////////////////////////////////////////////////////
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen
  }),
  overflowX: "hidden"
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  overflowX: "hidden",
  // ~56px when collapsed
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    // ~64px on larger screens
    width: `calc(${theme.spacing(8)} + 1px)`
  }
});

////////////////////////////////////////////////////////////////////////////////
// STYLED DRAWER
////////////////////////////////////////////////////////////////////////////////
const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open"
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme)
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme)
  })
}));

////////////////////////////////////////////////////////////////////////////////
// MAIN APP
////////////////////////////////////////////////////////////////////////////////
export default function App() {
  const theme = useTheme();

  // Whether the drawer is expanded (hover)
  const [open, setOpen] = useState(false);

  // Which WAF view is active - initialize as null or empty string
  const [view, setView] = useState("");

  // Hover to expand
  const handleMouseEnter = () => setOpen(true);
  // Mouse leave to collapse
  const handleMouseLeave = () => setOpen(false);

  // Decide which component to show
  const renderContent = () => {
    switch (view) {
      case "home":
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h4">Welcome Home</Typography>
          </Box>
        );
      case "ruleCheck":
        return <WAFRuleTree />;
      default:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h4">Select a view from the menu</Typography>
          </Box>
        );
    }
  };

  // Navigation items
  // Note: "home" now has a "link" property, so we can navigate directly
  const navItems = [
    { key: "home", label: "Home", icon: <HomeIcon />, link: "/" },
    { key: "ruleCheck", label: "Rule Check", icon: <DashboardIcon /> },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* Mini-variant drawer with hover expand */}
      

      {/* MAIN CONTENT AREA */}
      {/* <Box
        component="main"
        sx={{
          flexGrow: 1,
          // remove p: 2,
          // offset content by mini or full drawer width
          width: `calc(100% - ${open
            ? drawerWidth
            : parseInt(theme.spacing(8), 10) + 1
            }px)`
        }}
      > */}
        
        
        <WAFRuleTree />;
      </Box>
    // </Box>
  );
}
