
The files and their purpose are as follows:

1. schemas.js: 
      - Repository of all our schema definitions.
      - Single point of aggregation of all model APIs 
      - All models support one or more modelqueries which are consumed in views. schemas.js will aggregate all such modelqueries from all models into one structure.
      - Generic helper functions useful across the product, such as merge().


2. Model specific files: topic.js, entries.js etc.

     - They will assume that you have verified the params. They will only do basic checks 
       simply return the error if params are not met and return err if any.
     - They should implement all CRUD operations: create(), update() and so on. 
     - They should implement one or more modelqueries.
     - They should implement one or more modelqueries.


