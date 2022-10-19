const log_output = document.getElementById('output');
const query_types_container = document.getElementById('query-type-wrapper');
const nick_input: HTMLInputElement = document.getElementById('filter-nick') as HTMLInputElement
const body_input: HTMLInputElement = document.getElementById('filter-body') as HTMLInputElement

const query_types: {[type: number]: boolean} = {}

function switch_log_type(id: number) {
    if (query_types[id] === undefined)
        query_types[id] = true;
    else
        delete query_types[id]
}

function start_searching() {
    log_output!.innerHTML = "";
    const requested_types: number[] = [];
    for (let type in query_types) {
        requested_types.push(Number(type));
    }
    const nick = nick_input.value;
    const body = body_input.value;
    window.ALPEngine.request_logs(nick, body, requested_types)
}

function add_log_type_selector_group(name: string, text: string, 
    types: {type: number, name: string, text: string}[]) {
    
    const affected_types: number[] = [] 
    const group = document.createElement('div', {class: 'log-type-group'} as ElementCreationOptions);
    group.insertAdjacentHTML('beforeend', `
        <label>${text}</label>
    `)
    const group_checkbox = document.createElement('input');
    group_checkbox.type = 'checkbox';
    group_checkbox.id = name
    group.insertAdjacentElement('afterbegin', group_checkbox);
    const options_list = document.createElement('ul');
    options_list.className = 'query-type-options-container'
    const options_checkboxes: {element: HTMLInputElement, type: number}[] = [];

    let expanded: boolean = false;
    const collapse_button = document.createElement('button');

    const arrow = document.createElement('img')
    arrow.src = '../static/arrow_up.svg';
    arrow.style.height = '10px';

    collapse_button.className = "collapse-button"
    collapse_button.insertAdjacentElement('beforeend', arrow);
    collapse_button.style.height = '20px';
    collapse_button.onclick = () => {
        if (expanded) {
            arrow.style.rotate = '180deg';
            options_list.style.visibility = "hidden";
            options_list.style.maxHeight = "0px";
        }
        else {
            arrow.style.rotate = '0deg';
            options_list.style.visibility = "visible";
            options_list.style.maxHeight = "none";
        }
        expanded = !expanded;
    }

    expanded = !expanded;
    collapse_button.click();
    group.insertAdjacentElement('beforeend', collapse_button);
    

    for (let log_type of types) {
        const type_option = document.createElement('li');
        const type_option_checkbox = document.createElement('input')
        type_option_checkbox.type = "checkbox";
        type_option_checkbox.id = log_type.name;
        type_option_checkbox.onchange = () => {
            switch_log_type(log_type.type);
            group_checkbox.checked = false;
        }
        type_option.insertAdjacentHTML('beforeend', `
            <label>${log_type.text}</label>
        `)
        options_checkboxes.push({element: type_option_checkbox, type: log_type.type});
        type_option.insertAdjacentElement('afterbegin', type_option_checkbox);
        options_list.insertAdjacentElement('beforeend', type_option);
        affected_types.push(log_type.type);
    }
    group_checkbox.onchange = () => {
        if (group_checkbox.checked)
            for (let checkbox of options_checkboxes) {
                checkbox.element.checked = true;
                query_types[checkbox.type] = true;
            }
        else
            for (let checkbox of options_checkboxes) {
                checkbox.element.checked = false;
                delete query_types[checkbox.type];
            }
    }
    group.insertAdjacentElement('beforeend', options_list)
    query_types_container?.insertAdjacentElement('beforeend', group);
}

function add_log(log: string) {
    log_output?.insertAdjacentHTML('beforeend', '<span>' + log + '</span>')
}

window.ALPEngine.set_listener('add_log', ((logs: {src: string}[]) => {
    console.log(logs)
    if (logs.length > 0) {
        for (let log of logs) {
            add_log(log.src);
        }
    }
    else {
        add_log('Нет результатов')
    }
}))


add_log_type_selector_group('all-server', 'Технические', [
    {type: 12, name: 'activity-money', text: 'Сервер вкл'},
    {type: 13, name: 'activity-trade', text: 'Сервер выкл'},
])

add_log_type_selector_group('all-teleportation', 'Телепортации', [
    {type: 21, name: 'teleportation-relocation', text: 'Перемещение'},
    {type: 22, name: 'teleportation-to-player', text: 'К игроку'},
])

add_log_type_selector_group('all-activity', 'Активность', [
    {type: 31, name: 'activity-money', text: 'Деньги'},
    {type: 32, name: 'activity-trade', text: 'Трейды'},
    {type: 33, name: 'activity-region', text: 'Регионы'},
    {type: 34, name: 'activity-kit', text: 'Киты'},
])

add_log_type_selector_group('all-death', 'Смерти', [
    {type: 41, name: 'death-death', text: 'Смерть'},
    {type: 42, name: 'death-kill', text: 'Убийство'},
])
add_log_type_selector_group('all-session', 'Сессии', [
    {type: 51, name: 'session-login', text: 'Вход'},
    {type: 52, name: 'session-logout', text: 'Выход'},
    {type: 53, name: 'session-vanish', text: 'Ваниш'},
])

add_log_type_selector_group('all-message', 'Сообщения', [
    {type: 61, name: 'message-global', text: 'Глобальные'},
    {type: 62, name: 'message-local', text: 'Локальные'},
    {type: 63, name: 'message-private', text: 'Личные'},
    {type: 64, name: 'message-mod', text: 'Мод.чат'},
])

add_log_type_selector_group('all-punishment', 'Наказания', [
    {type: 61, name: 'punishment-warn', text: 'Варн'},
    {type: 62, name: 'punishment-kick', text: 'Кик'},
    {type: 63, name: 'punishment-mute', text: 'Мут'},
    {type: 64, name: 'punishment-ban', text: 'Бан'},
])

window.ALPEngine.update_all();