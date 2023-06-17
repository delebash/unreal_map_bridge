export default {
    root: 'src',
    esbuild: {
        supported: {
            'top-level-await': true //browsers can handle top-level-await features
        }
    },
    build: {
        outDir: '../dist'
    }
}
