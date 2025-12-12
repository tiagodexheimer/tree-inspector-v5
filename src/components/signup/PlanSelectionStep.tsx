// src/components/signup/PlanSelectionStep.tsx
import React from 'react';
import { Box, Switch, FormControlLabel } from '@mui/material';
import { PLANS, PlanId } from '@/config/plans';
import PlanCard from './PlanCard';

interface PlanSelectionStepProps {
  selectedPlan: PlanId;
  onPlanSelect: (planId: PlanId) => void;
  isMonthly: boolean;
  onBillingFrequencyChange: (isMonthly: boolean) => void;
}

const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({
  selectedPlan,
  onPlanSelect,
  isMonthly,
  onBillingFrequencyChange,
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Switch de Mensal/Anual */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={!isMonthly}
              onChange={(e) => onBillingFrequencyChange(!e.target.checked)}
              name="billingFrequency"
              color="primary"
            />
          }
          label={!isMonthly ? "Anual (2 meses grátis)" : "Mensal"}
        />
      </Box>

      {/* Layout Flexbox de Planos COM SCROLL HORIZONTAL */}
      <Box 
        sx={{ 
          mb: 4, 
          width: '100%', 
          maxWidth: { xs: '100%', lg: 1200 },
          margin: '0 auto',
          display: 'flex', 
          gap: 3, 
          overflowX: 'auto', 
          paddingBottom: 2, 
        }}
      >
        {PLANS.map(plan => {
          const isSelected = plan.id === selectedPlan;
          
          let buttonText = 'Selecionar Plano';
          if (!plan.isAvailable) {
              buttonText = 'Em Breve';
          } else if (isSelected) {
              buttonText = 'Criar Conta';
          }
          
          return (
            <Box 
              key={plan.id}
              sx={{ 
                flex: '0 0 auto', 
                minWidth: { xs: '80%', sm: 280 }, 
                maxWidth: { xs: '80%', sm: 300 },
                scrollSnapAlign: 'start' 
              }} 
            >
              <PlanCard 
                plan={plan}
                selectedPlan={selectedPlan}
                onSelect={onPlanSelect} // A delegação do clique está aqui
                isMonthly={isMonthly}
                buttonText={buttonText} 
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PlanSelectionStep;