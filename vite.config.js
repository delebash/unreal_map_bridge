export default {
    root: 'src',
    build: {
        outDir: '../dist'
    },
    esbuild: {
        supported: {
            'top-level-await': true //browsers can handle top-level-await features
        },
    },
    worker:{
        format: 'es'
    }
}
