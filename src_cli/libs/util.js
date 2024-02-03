global.console.die = function( code, ...args ) { this.error( ...args ); process.exit( code ); }
global.SCDCLI = {
    checkURLS ( urls ) {
        for ( const url of urls ) {
            if ( !(
                url.startsWith( "https://soundcloud.com/" ) ||
                url.startsWith( "soundcloud.com/" ) ||
                url.startsWith( "/" ) || url.split( "/" ).length == 2
            ) ) return false;
        }
        return true;
    },
    normalizeURL ( url ) {
        if ( url.startsWith( "https://soundcloud.com/" ) ) return url;
        if ( url.startsWith( "soundcloud.com/" ) ) return "https://" + url;
        if ( url.startsWith( "/" ) ) return "https://soundcloud.com" + url;
        if ( url.split( "/" ).length == 2 ) return "https://soundcloud.com/" + url;
        return url;
    },
    scrapeClientId ( container ) {
        const find = ':{client_id:"';
        const lend = '"}';
        const lock = container.indexOf( find );
        const padx = container.slice( lock + find.length, lock + find.length + 80 );
        return padx.slice( 0, padx.indexOf( lend ) );
    },
    createIterator ( func, element, passthru = e => e ) {
        let el = element;
        let fk = func;
        el.unshift("");
        return {
            iterate: () => { el.shift(); if( el.length == 0  ) return; fk(passthru(el[0])); }
        }
    },
    pathsafe ( text ) {
        return text.replace(/([^a-z0-9\s\-\.]+)/gi, '_');
    }
}