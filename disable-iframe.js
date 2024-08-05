// ==UserScript==
// @name         WendaPlus: Disable All Iframes
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  阻止所有的 iframe 元素自动加载，防止页面卡顿
// @author       xgugugu
// @match        https://wenda.codingtang.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

$('iframe').each(function() {
    $(this).after($('<a></a>').text($(this).attr('src')).attr('href', $(this).attr('src')));
    $(this).remove();
});
