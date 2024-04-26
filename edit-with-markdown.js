// ==UserScript==
// @name         WendaPlus: Edit with Markdown
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  使用 Markdown 编辑内容
// @author       xgugugu
// @match        https://wenda.codingtang.com/questions/*/
// @license      MIT
// @require      https://cdn.staticfile.org/jquery/3.7.1/jquery.min.js
// @require      https://cdn.staticfile.org/markdown-it/13.0.1/markdown-it.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/KaTeX/0.16.8/katex.min.js
// ==/UserScript==

/* 抄自 https://github.com/luogu-dev/markdown-palettes/blob/master/src/FixedMarkdownItVKatex.js 略有修改 */
function isValidDelim(state, pos)
{
    return {can_open : true, can_close : true};
}

function math_inline(state, silent)
{
    var start, match, token, res, pos, esc_count;

    if (state.src[state.pos] !== "$")
    {
        return false;
    }

    res = isValidDelim(state, state.pos);
    if (!res.can_open)
    {
        if (!silent)
        {
            state.pending += "$";
        }
        state.pos += 1;
        return true;
    }

    // First check for and bypass all properly escaped delimieters
    // This loop will assume that the first leading backtick can not
    // be the first character in state.src, which is known since
    // we have found an opening delimieter already.
    start = state.pos + 1;
    match = start;
    while ((match = state.src.indexOf("$", match)) !== -1)
    {
        // Found potential $, look for escapes, pos will point to
        // first non escape when complete
        pos = match - 1;
        while (state.src[pos] === "\\")
        {
            pos -= 1;
        }

        // Even number of escapes, potential closing delimiter found
        if (((match - pos) % 2) == 1)
        {
            break;
        }
        match += 1;
    }

    // No closing delimter found.  Consume $ and continue.
    if (match === -1)
    {
        if (!silent)
        {
            state.pending += "$";
        }
        state.pos = start;
        return true;
    }

    // Check if we have empty content, ie: $$.  Do not parse.
    if (match - start === 0)
    {
        if (!silent)
        {
            state.pending += "$$";
        }
        state.pos = start + 1;
        return true;
    }

    // Check for valid closing delimiter
    res = isValidDelim(state, match);
    if (!res.can_close)
    {
        if (!silent)
        {
            state.pending += "$";
        }
        state.pos = start;
        return true;
    }

    if (!silent)
    {
        token = state.push('math_inline', 'math', 0);
        token.markup = "$";
        token.content = state.src.slice(start, match);
    }

    state.pos = match + 1;
    return true;
}

function math_block(state, start, end, silent)
{
    var firstLine, lastLine, next, lastPos, found = false, token, pos = state.bMarks[start] + state.tShift[start],
                                            max = state.eMarks[start];

    if (pos + 2 > max)
    {
        return false;
    }
    if (state.src.slice(pos, pos + 2) !== '$$')
    {
        return false;
    }

    pos += 2;
    firstLine = state.src.slice(pos, max);

    if (silent)
    {
        return true;
    }
    if (firstLine.trim().slice(-2) === '$$')
    {
        // Single line expression
        firstLine = firstLine.trim().slice(0, -2);
        found = true;
    }

    for (next = start; !found;)
    {

        next++;

        if (next >= end)
        {
            break;
        }

        pos = state.bMarks[next] + state.tShift[next];
        max = state.eMarks[next];

        if (pos < max && state.tShift[next] < state.blkIndent)
        {
            // non-empty line with negative indent should stop the list:
            break;
        }

        if (state.src.slice(pos, max).trim().slice(-2) === '$$')
        {
            lastPos = state.src.slice(0, max).lastIndexOf('$$');
            lastLine = state.src.slice(pos, lastPos);
            found = true;
        }
    }

    if (next >= end)
        return false;
    state.line = next + 1;

    token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = (firstLine && firstLine.trim() ? firstLine + '\n' : '') +
                    state.getLines(start + 1, next, state.tShift[start], true) +
                    (lastLine && lastLine.trim() ? lastLine : '');
    token.map = [ start, state.line ];
    token.markup = '$$';
    return true;
}

function math_plugin(md, options)
{
    // Default options

    options = options || {};

    var escapeHtml = function(html) {
        var tagsToReplace = {'&' : '&amp;', '<' : '&lt;', '>' : '&gt;'};
        return html.replace(/[&<>]/g, function(tag) {
            return tagsToReplace[tag] || tag;
        });
    };

    // set KaTeX as the renderer for markdown-it-simplemath
    var katexInline = function(latex) {
        options.displayMode = false;
        options.output = 'mathml';
        try
        {
            return katex.renderToString(latex, options);
        }
        catch (error)
        {
            if (options.throwOnError)
            {
                console.log(error);
            }
            return escapeHtml(latex);
        }
    };

    var inlineRenderer = function(tokens, idx, options, env) {
        return katexInline(tokens[idx].content);
    };

    var katexBlock = function(latex) {
        options.displayMode = true;
        options.output = 'mathml';
        try
        {
            return katex.renderToString(latex, options);
        }
        catch (error)
        {
            if (options.throwOnError)
            {
                console.log(error);
            }
            return escapeHtml(latex);
        }
    };

    var blockRenderer = function(tokens, idx, options, env) {
        return katexBlock(tokens[idx].content);
    };

    md.inline.ruler.after('escape', 'math_inline', math_inline);
    md.block.ruler.after('blockquote', 'math_block', math_block,
                         {alt : [ 'paragraph', 'reference', 'blockquote', 'list' ]});
    md.renderer.rules.math_inline = inlineRenderer;
    md.renderer.rules.math_block = blockRenderer;
};
/* --- */

const md = window.markdownit({
    html: true,
    linkify: true,
    highlight : function(str, lang) {
        if (lang && hljs.getLanguage(lang))
        {
            try
            {
                return hljs.highlight(lang, str).value;
            }
            catch (__)
            {
            }
        }
        return '';
    }
});
md.use(math_plugin);

$('#div_id_text')
    .children('label')
    .after('<textarea id="md" style="width: 835px; height: 291px; font-family: monospace"></textarea>');

$('#md').on('input', function() {
    $('iframe.cke_wysiwyg_frame.cke_reset').contents().find('body').html(md.render($(this).val()));
});
