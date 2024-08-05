// ==UserScript==
// @name         WendaPlus: Disable All Iframes
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  阻止所有的 iframe 元素自动加载，防止页面卡顿
// @author       xgugugu
// @match        https://wenda.codingtang.com/*
// @grant        none
// @license      MIT
// @require      https://cdn.staticfile.org/jquery/3.7.1/jquery.min.js
// ==/UserScript==

$('iframe').each(function() {
    $(this).after($('<a></a>').text($(this).attr('src')).attr('href', $(this).attr('src')));
    $(this).remove();
});