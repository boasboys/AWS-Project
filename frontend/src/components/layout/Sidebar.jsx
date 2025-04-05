import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Menu as MenuIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  ChevronLeft as ChevronLeftIcon,
  BugReport as DebugIcon
} from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';
import { useThemeContext } from '../../context/ThemeContext';

const drawerWidth = 240;

export default function Sidebar({ view, setView }) {
  const [open, setOpen] = useState(false);
    const navigate = useNavigate();
  const { darkTheme, setDarkTheme, getColor } = useThemeContext();

  const menuItems = [
    { key: 'home', label: 'Home', icon: <HomeIcon sx={{ color: getColor('barText') }} t='true' />,onClick:() => navigate('/')} ,
    { key: 'tree', label: 'WAF Tree', icon: <TreeIcon sx={{ color: getColor('barText') }} t='true' /> },
    { key: 'debugger', label: 'Request Debugger', icon: <DebugIcon sx={{ color: getColor('barText') }} /> },
    {
      key: 'theme',
      label: darkTheme ? 'Light Mode' : 'Dark Mode',
      icon: darkTheme ? <LightModeIcon /> : <DarkModeIcon />,
      onClick: () => setDarkTheme(!darkTheme),
    },
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? drawerWidth : '64px',
        transition: 'width 0.2s ease-in-out',
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : '64px',
          transition: 'width 0.2s ease-in-out',
          bgcolor: getColor('barBackground'),
          borderRight: '1px solid',
          borderColor: getColor('border'),
          boxShadow: getColor('shadow'),
          overflowX: 'hidden',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          py: 0,
          borderBottom: '1px solid',
          borderColor: getColor('border'),
          minHeight: '64px',
        }}
      >
        <IconButton
          onClick={() => setOpen(!open)}
          sx={{
            color: getColor('barText'),
            transform: open ? 'none' : 'rotate(180deg)',
            transition: 'transform 0.2s ease-in-out',
            p: 0.5,
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={!item.onClick && view === item.key}
              onClick={item.onClick || (() => setView(item.key))}
              sx={{
                minHeight: 48,
                justifyContent: 'initial',
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: getColor('selected'),
                  '&:hover': {
                    bgcolor: getColor('selectedHover'),
                  },
                },
                '&:hover': {
                  bgcolor: getColor('hover'),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 2,
                  justifyContent: 'center',
                  color:
                    getColor('barText')
                }}
              >
                <Tooltip
                  title={!open ? item.label : ''}
                  placement="right"
                >
                  <span>{item.icon}</span>
                </Tooltip>
              </ListItemIcon>

              <Fade in={open} timeout={400} unmountOnExit>
                <ListItemText
                  primary={item.label}
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    '& .MuiTypography-root': {
                      fontWeight: !item.onClick && view === item.key ? 600 : 400,
                      color: getColor('barText')
                    },
                  }}
                />
              </Fade>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}