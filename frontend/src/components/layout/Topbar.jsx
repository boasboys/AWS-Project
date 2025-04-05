import { Box, IconButton, Tooltip, Badge, TextField, Button, Typography } from '@mui/material';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState } from 'react';
import { useThemeContext } from '../../context/ThemeContext';

const TopBar = ({ searchTerm, setSearchTerm, onWarnings, warningCount, setLoaderPopupOpen, aclDetails, onExportPdf, onExportImage }) => {
  const [showSearch, setShowSearch] = useState(false);
  const { getColor } = useThemeContext();

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        borderColor: getColor('border'),
        boxShadow: getColor('shadow'),
        backgroundColor: getColor('barBackground'),
        zIndex: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Upload JSON">
          <IconButton onClick={() => setLoaderPopupOpen(p => !p)} sx={{ color: getColor('barText') }}>
            <CloudUploadIcon />
          </IconButton  >
        </Tooltip>
        <Tooltip title="Export as PNG">
          <IconButton sx={{ color: getColor('barText') }} onClick={onExportImage}>
            <ImageIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export as PDF">
          <IconButton sx={{ color: getColor('barText') }} onClick={onExportPdf}>
            <PictureAsPdfIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Search">
          <IconButton
            onClick={() => setShowSearch(!showSearch)}
            sx={{ color: getColor('barText') }}
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>
        {showSearch && (
          <TextField
            size="small"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              backgroundColor: getColor('background'), input: { color: getColor('barText') },
              ml: 1,
              width: 200,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: getColor('border')
                }
              }
            }}
          />
        )}
      </Box>

      <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
        <Typography variant='h6' sx={{ color: getColor('barText') }}>
          <Tooltip title="ACL Name">
            <span>{aclDetails.aclName || ''}</span>
          </Tooltip>
        </Typography>
      </Box>

      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
        {aclDetails.capacity > 1500 ? (
          <WarningAmberIcon fontSize="small" sx={{ color: 'red' }} />
        ) : aclDetails.capacity > 1300 ? (
          <WarningAmberIcon fontSize="small" sx={{ color: 'orange' }} />
        ) : null}
        <Typography
          variant="body2"
          sx={{
            color: getColor('text'),
            mr: 1,
            marginLeft: '10px'
          }}
        >
          <Tooltip title="WCUs used">
            <span>{aclDetails.capacity > 0 ? `WCUs: ${aclDetails.capacity} / 1500` : ''}</span>
          </Tooltip>
        </Typography>
        {warningCount > 0 && (
          <Tooltip title="Show Validation Warnings">
            <IconButton sx={{ color: getColor('barText') }} onClick={onWarnings}>
              <Badge badgeContent={warningCount} color="warning">
                <WarningAmberIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default TopBar;