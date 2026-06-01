import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { RoundPlayerStatus } from '@wemsic/shared';

export function RoundPlayers({
  players,
  currentPlayerId,
}: {
  players: RoundPlayerStatus[];
  currentPlayerId: string;
}) {
  return (
    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="overline" color="text.secondary">
          Players
        </Typography>
        <List dense disablePadding>
          {players.map((p) => (
            <ListItem key={p.playerId} disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {p.done ? (
                  <CheckCircleOutlineIcon color="secondary" fontSize="small" />
                ) : (
                  <RadioButtonUncheckedIcon
                    sx={{ color: 'text.disabled' }}
                    fontSize="small"
                  />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  p.playerId === currentPlayerId
                    ? `${p.displayName} (you)`
                    : p.displayName
                }
                secondary={p.done ? 'Done' : 'In progress'}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
