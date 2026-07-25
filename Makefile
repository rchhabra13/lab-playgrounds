DOMAIN ?= code
DOMAIN_DIR := domains/$(DOMAIN)

.PHONY: data download dedup decontaminate report clean

data: download dedup decontaminate

download:
	python3 -m src.data.download --config $(DOMAIN_DIR)/data_config.yaml

dedup:
	python3 -m src.data.dedup --config $(DOMAIN_DIR)/data_config.yaml

decontaminate:
	python3 -m src.data.decontaminate --config $(DOMAIN_DIR)/data_config.yaml

report:
	python3 -m src.eval.report --domain $(DOMAIN)

clean:
	rm -rf $(DOMAIN_DIR)/data/processed
