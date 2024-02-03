/*
    Soundcloud Downloader, written in Javascript.
    Made by Citrizon.
*/

const axios = require("axios"),
      fs    = require("fs"),
      path  = require("path")

module.exports =  class SoundcloudDownloader {
    // API Endpoints
    static endpoints = {
        "resolve": "https://api-v2.soundcloud.com/resolve?client_id=[0]&url=[1]"
    }

    // Utilities
    static utilities = {
        str_format ( source, array ) {
            let output = source;
            array.forEach( ( element, index ) => 
                output = output.replaceAll(`[${index}]`, element) );
            return output;
        },
        async fetchFile ( url, wstream, i, p, e ) {
            const { data, headers } = await axios( { url, method: 'GET', responseType: 'stream', onDownloadProgress: p ?? undefined } );
            i( parseInt( headers['content-length'] ) );
            data.on( 'end', e );
            data.pipe( wstream );
        },
        scrapeClientId( container ) {
            const find = ':{client_id:"';
            const lend = '"}';
            const lock = container.indexOf( find );
            const padx = container.slice( lock + find.length, lock + find.length + 80 );
            return padx.slice( 0, padx.indexOf( lend ) );
        },
        rMatchAll ( source, regex, index = 0 ) {
            let matches = source.matchAll( regex );
            let output = [];
            for ( const match of matches ) output.push( match[index] );
            return output;
        },
        scrapeReleaseTitle ( artist, content ) {
            let atX = content.split( '-' );
            let atZ = artist.split( ' ' );
            let artistName = "";
            if ( atX.length < 2 ) return content;
            for ( const ar of atZ ) {
                if (content.toLowerCase().indexOf(ar.toLowerCase()) == -1) continue;
                const lL = ar.toLowerCase();
                const jL = new RegExp(` *\\((${lL})[^)]*\\) *`, 'gi');
                let o = 0;
                atX.forEach(h => {
                    h = h.replace(jL, '');
                    atX[o] = h;
                    if (h.toLowerCase().includes(lL)) atX.splice(o, 1); else o++;
                });
                return atX.join("-").trim();
            } 
        },
        async axiText ( url ) {
            return ( await axios( { url: url, responseType: 'text', responseEncoding: 'utf-8' } ) ).data
        },
        async axiBuffer ( url ) {
            return ( await axios( { url: url, responseType: 'arraybuffer', } ) ).data
        }
    }

    constructor ( options = {} ) {
        this.clientId = options.clientId ?? null;
        this.utils = SoundcloudDownloader.utilities;
        this.epoint = SoundcloudDownloader.endpoints;
    }

    static async generateClientID () {
        let rawdata = await this.utilities.axiText( 'https://soundcloud.com' );
        let clientAssetURL = this.utilities.rMatchAll( rawdata, /src=\"(https:\/\/a-v2\.sndcdn\.com\/assets\/[^\.]+\.js)"/g, 1 ).pop();
        let clientAstCntnr = await this.utilities.axiText( clientAssetURL );
        return this.utilities.scrapeClientId( clientAstCntnr );
    }

    static async verifyClientID ( clientId ) {
        try {
            await this.utils.axiText( this.utilities.str_format( this.endpoints.resolve, [ clientId, encodeURIComponent( 'https://soundcloud.com/soundcloud/releasing-music-strategically' ) ] ) );
            return true
        } catch (error) {
            return false
        }
    }

    async resolveSong ( songUrl ) {
        if ( !this.clientId ) throw new Error( 'Client ID is not set, Cannot perform. (You may have forgotten to run generateClientID function? )' );
        let resolvedData = JSON.parse( await this.utils.axiText( this.utils.str_format( this.epoint.resolve, [ this.clientId, encodeURIComponent( songUrl ) ] ) ) );
        const publisherMetadata = resolvedData.publisher_metadata ?? {};

        const songArtist = ( publisherMetadata.artist ?? resolvedData.user.username );
        const songName = this.utils.scrapeReleaseTitle( songArtist, publisherMetadata.release_title ?? resolvedData.title );
        const songAlbumName = publisherMetadata.album_title ?? songName;
        const songGenre = resolvedData.genre ?? songArtist ?? songAlbumName;
        const songArt = resolvedData.artwork_url.replace( '-large', '-t500x500' );

        const songProgURL = JSON.parse( await this.utils.axiText(resolvedData.media.transcodings.filter( codec => codec.format.protocol == "progressive" )[0].url + "?client_id=" + this.clientId ) ).url;

        return {
            artist: songArtist ?? "SCD Unknown Artist",
            name: songName ?? "SCD Unknown Name",
            album: {
                name: songAlbumName,
                artUrl: songArt,
                fetchArt () { return SoundcloudDownloader.utilities.axiBuffer( this.artUrl ); }
            },
            genre: songGenre,
            url: songProgURL,
            async DownloadSong ( stream, oninit = e => e, onprogress = e => e, onend = e => e ) { 
                return await SoundcloudDownloader.utilities.fetchFile( this.url, stream, oninit, onprogress, onend ); 
            }
        }
    }
}