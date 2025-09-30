// Import necessary Material-UI components
import { Toolbar, IconButton } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'

export default function Header() {
    return (
        <div className='flex w-full justify-between items-center  text-white' style={{ background: '#257e1a' }}>
            <Toolbar variant="dense" className='w-full flex justify-between shadow-lg'>
            <div>
                <IconButton edge="start" color="inherit" aria-label="menu">
                    <MenuIcon />
                </IconButton>
            </div>
            <div>
                <h1>Tree Inspector V4</h1>
            </div>
            <div>
                Login
            </div>

        </Toolbar>
        </div>
    );
}