<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Workflow Definitions
    |--------------------------------------------------------------------------
    |
    | Define your workflows here. Each workflow has places, transitions,
    | a marking store, and an initial marking. The format mirrors Symfony's
    | workflow configuration.
    |
    */

    'workflows' => [
        // 'order' => [
        //     'type' => 'state_machine',
        //     'marking_store' => [
        //         'type' => 'property',
        //         'property' => 'status',
        //     ],
        //     'supports' => App\Models\Order::class,
        //     'initial_marking' => ['draft'],
        //     'places' => ['draft', 'submitted', 'approved', 'rejected', 'fulfilled'],
        //     'transitions' => [
        //         'submit' => ['from' => 'draft', 'to' => 'submitted'],
        //         'approve' => ['from' => 'submitted', 'to' => 'approved'],
        //         'reject' => ['from' => 'submitted', 'to' => 'rejected'],
        //         'fulfill' => ['from' => 'approved', 'to' => 'fulfilled'],
        //     ],
        // ],
    ],

];
