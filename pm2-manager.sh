#!/bin/bash

# Colors for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# App configuration
WEB_NAME="drlacin-web"
WORKER_NAME="drlacin-worker"
WEB_SCRIPT="npm run web:prod"
WORKER_SCRIPT="npm run worker:prod"

# Clear screen function
clear_screen() {
    clear
    echo -e "${BLUE}${BOLD}"
    echo "╔══════════════════════════════════════╗"
    echo "║         DRLACIN PM2 MANAGER          ║"
    echo "╚══════════════════════════════════════╝"
    echo -e "${NC}"
}

# Show current status
show_status() {
    echo -e "${YELLOW}Current PM2 Status:${NC}"
    pm2 list 2>/dev/null || echo "PM2 not running or no processes"
    echo
}

# Start applications
start_apps() {
    echo -e "${GREEN}Starting applications...${NC}"
    
    # Check if already running
    if pm2 list | grep -q "$WEB_NAME"; then
        echo -e "${YELLOW}Web app already running${NC}"
    else
        pm2 start "$WEB_SCRIPT" --name "$WEB_NAME"
        echo -e "${GREEN}Web app started${NC}"
    fi
    
    if pm2 list | grep -q "$WORKER_NAME"; then
        echo -e "${YELLOW}Worker already running${NC}"
    else
        pm2 start "$WORKER_SCRIPT" --name "$WORKER_NAME"
        echo -e "${GREEN}Worker started${NC}"
    fi
    
    echo
    pm2 save
    echo -e "${GREEN}Configuration saved${NC}"
}

# Stop applications
stop_apps() {
    echo -e "${RED}Stopping applications...${NC}"
    pm2 stop $WEB_NAME $WORKER_NAME 2>/dev/null || echo "Some processes weren't running"
    echo -e "${RED}Applications stopped${NC}"
}

# Restart applications
restart_apps() {
    echo -e "${YELLOW}Restarting applications...${NC}"
    pm2 restart $WEB_NAME $WORKER_NAME 2>/dev/null || echo "Starting apps as they weren't running"
    echo -e "${GREEN}Applications restarted${NC}"
}

# Delete applications
delete_apps() {
    echo -e "${RED}Deleting applications from PM2...${NC}"
    pm2 delete $WEB_NAME $WORKER_NAME 2>/dev/null || echo "Some processes weren't found"
    echo -e "${RED}Applications deleted${NC}"
}

# Show logs
show_logs() {
    echo -e "${BLUE}Choose log option:${NC}"
    echo "1) View all logs"
    echo "2) View web logs only"
    echo "3) View worker logs only"
    echo "4) Follow logs (real-time)"
    echo "5) Back to main menu"
    
    read -p "Enter choice [1-5]: " log_choice
    
    case $log_choice in
        1) pm2 logs ;;
        2) pm2 logs $WEB_NAME ;;
        3) pm2 logs $WORKER_NAME ;;
        4) echo -e "${YELLOW}Following logs... Press Ctrl+C to stop${NC}"; pm2 logs --follow ;;
        5) return ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
}

# Monitor applications
monitor_apps() {
    echo -e "${BLUE}Opening PM2 monitor...${NC}"
    pm2 monit
}

# Setup startup script
setup_startup() {
    echo -e "${GREEN}Setting up auto-startup...${NC}"
    pm2 startup
    echo
    echo -e "${YELLOW}After running the generated command above, run this script again and choose 'Save Configuration'${NC}"
}

# Save configuration
save_config() {
    echo -e "${GREEN}Saving PM2 configuration...${NC}"
    pm2 save
    echo -e "${GREEN}Configuration saved! Apps will auto-start on reboot.${NC}"
}

# Kill all PM2 processes
kill_all() {
    echo -e "${RED}${BOLD}WARNING: This will kill ALL PM2 processes!${NC}"
    read -p "Are you sure? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        pm2 kill
        echo -e "${RED}All PM2 processes killed${NC}"
    else
        echo -e "${YELLOW}Operation cancelled${NC}"
    fi
}

# Build application
build_app() {
    echo -e "${BLUE}Building application...${NC}"
    npm run build
    echo -e "${GREEN}Build complete!${NC}"
}

# Main menu
show_menu() {
    echo -e "${BOLD}Select an option:${NC}"
    echo
    echo -e "  ${GREEN}1)${NC} Start Applications"
    echo -e "  ${RED}2)${NC} Stop Applications" 
    echo -e "  ${YELLOW}3)${NC} Restart Applications"
    echo -e "  ${RED}4)${NC} Delete Applications"
    echo -e "  ${BLUE}5)${NC} Show Status"
    echo -e "  ${BLUE}6)${NC} View Logs"
    echo -e "  ${BLUE}7)${NC} Monitor (Real-time)"
    echo
    echo -e "  ${GREEN}8)${NC} Build Application"
    echo -e "  ${GREEN}9)${NC} Setup Auto-startup"
    echo -e "  ${GREEN}10)${NC} Save Configuration"
    echo
    echo -e "  ${RED}11)${NC} Kill All PM2 Processes"
    echo -e "  ${RED}0)${NC} Exit"
    echo
}

# Main loop
main() {
    while true; do
        clear_screen
        show_status
        show_menu
        
        read -p "Enter your choice [0-11]: " choice
        echo
        
        case $choice in
            1) start_apps ;;
            2) stop_apps ;;
            3) restart_apps ;;
            4) delete_apps ;;
            5) show_status ;;
            6) show_logs ;;
            7) monitor_apps ;;
            8) build_app ;;
            9) setup_startup ;;
            10) save_config ;;
            11) kill_all ;;
            0) 
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0 
                ;;
            *)
                echo -e "${RED}Invalid option. Please try again.${NC}"
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..." 
    done
}

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed. Installing...${NC}"
    npm install -g pm2
fi

# Run main function
main