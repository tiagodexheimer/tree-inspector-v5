// src/components/signup/PlanCard.tsx
import React from 'react';
import { Plan, PlanId } from '@/config/plans';
import { Card, CardContent, Typography, Chip, Divider, List, ListItem, ListItemIcon, ListItemText, Button, Box, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import LockIcon from '@mui/icons-material/Lock';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

interface PlanCardProps {
  plan: Plan;
  selectedPlan: PlanId;
  onSelect: (planId: PlanId) => void;
  isMonthly: boolean;
  buttonText: string;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, selectedPlan, onSelect, isMonthly, buttonText }) => {
  const isSelected = plan.id === selectedPlan;
  const isLocked = !plan.isAvailable; 

  // Lógica para calcular o preço (mensal ou anual com desconto)
  let calculatedPrice = plan.price;
  if (plan.price > 0 && !isMonthly) {
      // 10x o preço mensal (2 meses grátis)
      calculatedPrice = plan.price * 10; 
  }
  const priceDisplay = calculatedPrice === 0 ? 'Grátis' : `R$ ${calculatedPrice.toFixed(2)}`;
  const frequency = isMonthly ? '/mês' : ' Total Anual'; 

  return (
      <Tooltip title={isLocked ? "Funcionalidade em desenvolvimento." : ""}>
          <Card 
              onClick={() => !isLocked && onSelect(plan.id)} 
              elevation={isSelected ? 10 : 2}
              sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.7 : 1,
                  border: isSelected ? '3px solid #257e1a' : '1px solid #ddd',
                  transition: 'all 0.2s',
                  position: 'relative'
              }}
          >
              {isLocked && ( 
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.3)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LockIcon sx={{ color: 'white', fontSize: 50 }} />
                  </Box>
              )}
              <CardContent sx={{ flexGrow: 1, minWidth: 0 }}> 
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {plan.title}
                  </Typography>
                  <Chip 
                    label={plan.tag} 
                    color={plan.isPaid ? 'success' : 'default'} 
                    size="small" 
                    icon={plan.isPaid ? <LocalOfferIcon/> : undefined}
                    sx={{ mb: 1, mr: 1, fontWeight: 'bold' }}
                  />
                  <Typography variant="h4" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {priceDisplay}
                    {plan.price > 0 && <Typography component="span" variant="body2" color="text.secondary">{frequency}</Typography>}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <List dense disablePadding>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1, mb: 1, color: isLocked ? 'text.disabled' : 'inherit' }}>
                          O que está incluído:
                      </Typography>
                      {plan.features.map((feature, index) => (
                          <ListItem key={`feat-${index}`} disableGutters sx={{ py: 0 }}>
                              <ListItemIcon sx={{ minWidth: 30, color: 'success.main' }}>
                                  <CheckCircleIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                  primary={<Typography variant="body2">{feature}</Typography>} 
                                  sx={{ flexShrink: 1, minWidth: 0 }}
                              />
                          </ListItem>
                      ))}
                      {plan.limits.map((limit, index) => (
                          <ListItem key={`limit-${index}`} disableGutters sx={{ py: 0 }}>
                              <ListItemIcon sx={{ minWidth: 30, color: 'error.main' }}>
                                  <RemoveCircleIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                  primary={<Typography variant="body2">{limit}</Typography>} 
                                  sx={{ flexShrink: 1, minWidth: 0 }}
                              />
                          </ListItem>
                      ))}
                  </List>
              </CardContent>
              <Box sx={{ p: 2 }}>
                  <Button 
                      onClick={(e) => { e.stopPropagation(); !isLocked && onSelect(plan.id); }}
                      variant={isSelected ? 'contained' : 'outlined'} 
                      color={isSelected ? 'success' : 'primary'} 
                      fullWidth
                      disabled={isLocked}
                      sx={{ bgcolor: isSelected ? '#257e1a' : undefined, '&:hover': { bgcolor: isSelected ? '#1a5912' : undefined } }}
                  >
                      {buttonText}
                  </Button>
              </Box>
          </Card>
      </Tooltip>
  );
};

export default PlanCard;