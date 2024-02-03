module.exports = class LibManager {
    constructor ( folder = require.main.path + "/libs" ) {
        require( 'fs' ).readdirSync( `${folder}/` ).forEach( file => {
            if ( !file.endsWith( '.js' ) ) return;
            this[ file.slice( 0, -3 ) ] = require( './libs/'+file );
        } )
    }
}