/*
 * # merlin-box - A sing-box + smartdns routing and proxy script solution for ASUSWRT-Merlin routers.
 * # Copyright (C) 2026 LandDuck <https://github.com/LandDuck/>
 * #
 * # This program is free software: you can redistribute it and/or modify
 * # it under the terms of the GNU General Public License as published by
 * # the Free Software Foundation, either version 3 of the License, or
 * # (at your option) any later version.
 * #
 * # This program is distributed in the hope that it will be useful,
 * # but WITHOUT ANY WARRANTY; without even the implied warranty of
 * # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * # GNU General Public License for more details.
 * #
 * # You should have received a copy of the GNU General Public License
 * # along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export default {
    comm_init: 'api/init',
    comm_login: 'api/login',
    comm_changePassword: 'api/change_password',
    comm_status: 'api/status',
    comm_logout: 'api/logout',
    comm_stop: 'api/stop',
    comm_restart: 'api/restart',
    comm_start: 'api/start',
    comm_updateRules: 'api/update_rules',
    comm_showDhcpClientList: 'api/show_dhcp_client_list',
    comm_getDeviceControlConfig: 'api/get_device_control_config',
    comm_saveDeviceControlConfig: 'api/save_device_control_config',
    comm_getIP4ControlConfig: 'api/get_ip4_control_config',
    comm_saveIP4ControlConfig: 'api/save_ip4_control_config',
    comm_getIP6ControlConfig: 'api/get_ip6_control_config',
    comm_saveIP6ControlConfig: 'api/save_ip6_control_config',
    comm_getDomainControlConfig: 'api/get_domain_control_config',
    comm_saveDomainControlConfig: 'api/save_domain_control_config',
    comm_getBaseConfig: 'api/get_base_config',
    comm_saveBaseConfig: 'api/save_base_config',
    comm_addNode: 'api/add_node',
    comm_loadNodeList: 'api/load_node_list',
    comm_deleteNode: 'api/delete_node',
    comm_setDefaultNode: 'api/set_default_node',
}


